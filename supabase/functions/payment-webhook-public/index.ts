import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

// Obter as credenciais do Mercado Pago das variáveis de ambiente
const MP_CLIENT_ID = Deno.env.get('MP_PROD_CLIENT_ID') || ''
const MP_CLIENT_SECRET = Deno.env.get('MP_PROD_CLIENT_SECRET') || ''
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') || ''

console.log('Iniciando webhook-public...');
console.log('Ambiente:', Deno.env.get('DENO_ENV'));
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY);
console.log('Client ID disponível:', !!MP_CLIENT_ID);
console.log('Client Secret disponível:', !!MP_CLIENT_SECRET);
console.log('Webhook Secret disponível:', !!MP_WEBHOOK_SECRET);

// Função para obter um token de acesso usando client_id e client_secret
async function getAccessToken() {
  try {
    console.log('Tentando obter token de acesso com Client ID e Secret');
    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': MP_CLIENT_ID,
        'client_secret': MP_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao obter token de acesso:', errorData);
      throw new Error(`Erro ao obter token de acesso: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Token de acesso obtido com sucesso');
    return data.access_token;
  } catch (error) {
    console.error('Erro ao obter token de acesso:', error);
    throw new Error(`Erro ao obter token de acesso: ${error.message}`);
  }
}

// Cache do token de acesso para evitar chamadas repetidas
let cachedToken = null;
let tokenExpiry = 0;

// Função para obter um token válido (do cache ou gerar um novo)
async function getValidToken() {
  const now = Date.now();
  
  // Se o token estiver em cache e ainda for válido, retornar
  if (cachedToken && tokenExpiry > now) {
    console.log('Usando token em cache');
    return cachedToken;
  }
  
  // Caso contrário, gerar um novo token
  console.log('Gerando novo token com Client ID e Client Secret');
  const token = await getAccessToken();
  
  // Armazenar o token em cache (validade de 5 horas, o token dura 6 horas)
  cachedToken = token;
  tokenExpiry = now + 5 * 60 * 60 * 1000;
  
  return token;
}

serve(async (req) => {
  // Lidar com requisições OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Log da requisição recebida para diagnóstico completo
  console.log('Requisição recebida:');
  console.log('- Método:', req.method);
  console.log('- URL:', req.url);
  
  try {
    // Verificar o método da requisição
    if (req.method !== 'POST') {
      console.log('Método não permitido:', req.method);
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se há corpo da requisição
    const contentType = req.headers.get('content-type') || ''
    
    if (!contentType.includes('application/json')) {
      console.error('Content-Type não suportado:', contentType);
      return new Response(JSON.stringify({ error: 'Content-Type não suportado' }), {
        status: 415,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Ler o corpo da requisição
    const body = await req.json();
    console.log('Corpo da requisição:', JSON.stringify(body));

    // Obter os dados do pagamento
    if (!body.data) {
      console.error('Corpo da requisição não contém dados do pagamento');
      return new Response(JSON.stringify({ error: 'Corpo da requisição não contém dados do pagamento' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Tipo de notificação:', body.action);
    console.log('ID da notificação:', body.id);
    console.log('Dados do pagamento:', JSON.stringify(body.data));

    // Obter o tipo de ação
    // https://www.mercadopago.com.br/developers/pt/docs/checkout-api/webhook/payment
    const action = body.action || '';
    
    if (action !== 'payment.created' && action !== 'payment.updated') {
      console.log('Ação não tratada:', action);
      return new Response(JSON.stringify({ success: true, message: 'Ação não tratada' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Para notificações de pagamento, obter o ID do pagamento
    const paymentId = body.data.id;
    console.log('ID do pagamento:', paymentId);
    
    if (!paymentId) {
      console.error('ID do pagamento não encontrado na notificação');
      return new Response(JSON.stringify({ error: 'ID do pagamento não encontrado na notificação' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se é um ID de teste (123456)
    const isTestId = paymentId === '123456';
    const isTestMode = body.live_mode !== undefined && body.live_mode === false;
    
    if (isTestId || isTestMode) {
      console.log('Notificação de teste detectada. ID:', paymentId, 'live_mode:', body.live_mode);
      
      // Se for um teste do Mercado Pago, retornar sucesso sem processamento
      if (action === 'payment.updated' || action === 'payment.created') {
        console.log('Retornando sucesso para notificação de teste.');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Notificação de teste recebida com sucesso.',
          test_mode: true
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Buscar os detalhes completos do pagamento na API do Mercado Pago
    console.log('Buscando detalhes do pagamento na API do Mercado Pago...');
    const token = await getValidToken();
    
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('Erro ao buscar detalhes do pagamento:', errorData);
      
      // Se o erro for 404 (não encontrado) e for um ID de teste, retorne sucesso
      if (mpResponse.status === 404 && (isTestId || isTestMode)) {
        console.log('ID de pagamento de teste não encontrado na API, mas retornando sucesso.');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Notificação de teste recebida com sucesso.',
          test_mode: true
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'Erro ao buscar detalhes do pagamento', details: errorData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const paymentDetails = await mpResponse.json();
    console.log('Detalhes do pagamento recebidos:', JSON.stringify(paymentDetails));
    
    // Processar o pagamento com os detalhes completos
    return await processPayment(paymentDetails);

  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    
    return new Response(JSON.stringify({ error: 'Erro ao processar webhook', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Função para processar o pagamento e atualizar o banco de dados
async function processPayment(payment) {
  console.log('Processando pagamento:', JSON.stringify(payment))

  // Criar cliente Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    // Extrair informações do pagamento
    const paymentId = payment.id.toString();
    const paymentStatus = payment.status;
    const paymentAmount = payment.transaction_amount || payment.transaction_details?.total_paid_amount;
    const paymentMethod = payment.payment_method_id || payment.payment_type_id;
    
    // Verificar se temos metadados no pagamento (campos personalizados)
    const userId = payment.metadata?.user_id || payment.external_reference;
    const planId = payment.metadata?.plan_id;
    const planInterval = payment.metadata?.plan_interval;

    console.log('Dados extraídos do pagamento:');
    console.log('- ID:', paymentId);
    console.log('- Status:', paymentStatus);
    console.log('- Valor:', paymentAmount);
    console.log('- Método:', paymentMethod);
    console.log('- user_id:', userId);
    console.log('- plan_id:', planId);
    console.log('- plan_interval:', planInterval);
    console.log('- live_mode:', payment.live_mode);
    console.log('- metadata completo:', JSON.stringify(payment.metadata));
    console.log('- external_reference:', payment.external_reference);
    
    // Verificar se é um pagamento de teste (ID 123456 ou live_mode=false)
    const isTestPayment = paymentId === '123456' || (payment.live_mode !== undefined && payment.live_mode === false);
    
    if (!userId) {
      console.error('ID de usuário não encontrado no pagamento');
      
      if (isTestPayment) {
        console.log('Pagamento de teste detectado. Retornando sucesso sem processar.');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Pagamento de teste detectado. Notificação recebida com sucesso.',
          test_mode: true
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error('ID de usuário não encontrado no pagamento');
    }

    // Buscar a tentativa de pagamento usando user_id
    console.log('Buscando tentativa de pagamento no banco de dados usando user_id...');
    
    const { data: attemptData, error: attemptError } = await supabase
      .from('payment_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (attemptError) {
      console.error('Erro ao buscar tentativa de pagamento:', attemptError)
      throw new Error(`Erro ao buscar tentativa de pagamento: ${attemptError.message}`)
    }

    if (!attemptData || attemptData.length === 0) {
      console.log('Tentativa de pagamento não encontrada para o usuário:', userId)
      
      // Se não encontramos a tentativa, vamos criar um registro diretamente
      if (planId && planInterval) {
        console.log('Criando registro de pagamento diretamente dos metadados...');
        
        // Obter o plano
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('billing_interval', planInterval)
          .eq('active', true)
          .limit(1);
          
        if (planError) {
          console.error('Erro ao buscar plano:', planError)
          throw new Error(`Erro ao buscar plano: ${planError.message}`)
        }
        
        if (!planData || planData.length === 0) {
          console.error('Plano não encontrado para o intervalo:', planInterval)
          throw new Error('Plano não encontrado')
        }
        
        const plano = planData[0]
        console.log('Plano encontrado:', plano.id, plano.name)
        
        return await createPaymentRecord(supabase, payment, {
          user_id: userId,
          plan_id: plano.id,
          plan_name: plano.name,
          plan_price: paymentAmount,
          plan_interval: planInterval
        })
      } else {
        // Tentar criar um registro básico mesmo sem os metadados completos
        console.log('Tentando criar registro básico sem metadados completos...');
        
        // Criar registro de pagamento simples
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: userId,
            amount: paymentAmount,
            currency: 'BRL',
            payment_method: paymentMethod,
            transaction_id: paymentId,
            status: 'approved'
          })
          .select();

        if (paymentError) {
          console.error('Erro ao criar registro de pagamento básico:', paymentError);
          throw new Error(`Erro ao criar registro de pagamento básico: ${paymentError.message}`);
        }

        if (!paymentData || paymentData.length === 0) {
          console.error('Registro de pagamento criado, mas não foi possível recuperar os dados');
          throw new Error('Erro ao recuperar dados do pagamento criado');
        }

        console.log('Registro de pagamento básico criado com sucesso:', JSON.stringify(paymentData[0]));
        
        // Registrar no log financeiro
        await supabase
          .from('financial_logs')
          .insert({
            user_id: userId,
            action: 'payment_processed',
            description: 'Pagamento recebido via webhook (sem metadados completos)',
            data: { payment_id: paymentId, amount: paymentAmount }
          });
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Pagamento processado com sucesso (registro básico)',
          payment_id: paymentData[0].id
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log('Tentativa de pagamento encontrada:', JSON.stringify(attemptData[0]));

    // Atualizar o status da tentativa de pagamento
    const { error: updateError } = await supabase
      .from('payment_attempts')
      .update({ status: paymentStatus, updated_at: new Date().toISOString() })
      .eq('id', attemptData[0].id)

    if (updateError) {
      console.error('Erro ao atualizar tentativa de pagamento:', updateError)
      throw new Error(`Erro ao atualizar tentativa de pagamento: ${updateError.message}`)
    }

    console.log('Tentativa de pagamento atualizada com sucesso');

    // Se o pagamento foi aprovado, criar um registro na tabela payments e atualizar ou criar assinatura
    if (paymentStatus === 'approved') {
      return await createPaymentRecord(supabase, payment, attemptData[0])
    }

    // Retornar uma resposta de sucesso
    return new Response(JSON.stringify({ success: true, status: paymentStatus }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Erro ao processar pagamento:', error)
    
    return new Response(JSON.stringify({ error: 'Erro ao processar pagamento', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// Função auxiliar para criar registros de pagamento
async function createPaymentRecord(supabase, payment, attemptData) {
  console.log('Pagamento aprovado, criando registro na tabela payments');
      
  // Criar um registro de pagamento
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert({
      user_id: attemptData.user_id,
      amount: payment.transaction_amount || payment.transaction_details?.total_paid_amount,
      currency: 'BRL',
      payment_method: payment.payment_method_id || payment.payment_type_id,
      transaction_id: payment.id.toString(),
      status: 'approved'
    })
    .select();

  if (paymentError) {
    console.error('Erro ao criar registro de pagamento:', paymentError)
    throw new Error(`Erro ao criar registro de pagamento: ${paymentError.message}`)
  }

  if (!paymentData || paymentData.length === 0) {
    console.error('Registro de pagamento criado, mas não foi possível recuperar os dados');
    throw new Error('Erro ao recuperar dados do pagamento criado');
  }

  console.log('Registro de pagamento criado:', JSON.stringify(paymentData[0]));

  // Verificar se o usuário já tem uma assinatura ativa para esse plano
  console.log('Verificando assinatura existente...');
  
  // Primeiro, vamos obter o plano correto pelo intervalo
  let planId = attemptData.plan_id;
  
  // Se o plan_id não é um UUID válido, buscar o plano pelo intervalo
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId)) {
    console.log('ID do plano não é um UUID válido, buscando pelo intervalo...');
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('id')
      .eq('billing_interval', attemptData.plan_interval)
      .eq('active', true)
      .limit(1);
      
    if (planError) {
      console.error('Erro ao buscar plano pelo intervalo:', planError);
      throw new Error(`Erro ao buscar plano pelo intervalo: ${planError.message}`);
    }
    
    if (planData && planData.length > 0) {
      console.log('Plano encontrado pelo intervalo:', planData[0].id);
      planId = planData[0].id;
    } else {
      console.error('Nenhum plano encontrado para o intervalo:', attemptData.plan_interval);
      throw new Error('Nenhum plano encontrado para o intervalo especificado');
    }
  }
  
  const { data: subscriptionData, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', attemptData.user_id)
    .eq('plan_id', planId)
    .eq('status', 'active')
    .limit(1);

  if (subscriptionError) {
    console.error('Erro ao buscar assinatura:', subscriptionError)
    throw new Error(`Erro ao buscar assinatura: ${subscriptionError.message}`)
  }

  // Calcular a data de término com base no intervalo do plano
  const startDate = new Date()
  let endDate = new Date(startDate)
  
  console.log('Calculando data de término da assinatura com base no intervalo:', attemptData.plan_interval);
  
  if (attemptData.plan_interval === 'mensal') {
    endDate.setMonth(endDate.getMonth() + 1)
  } else if (attemptData.plan_interval === 'trimestral') {
    endDate.setMonth(endDate.getMonth() + 3)
  } else if (attemptData.plan_interval === 'anual') {
    endDate.setFullYear(endDate.getFullYear() + 1)
  }

  // Se já existe uma assinatura, atualizar, senão criar uma nova
  if (subscriptionData && subscriptionData.length > 0) {
    console.log('Assinatura existente encontrada, atualizando...');
    const { error: updateSubscriptionError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        end_date: endDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionData[0].id)

    if (updateSubscriptionError) {
      console.error('Erro ao atualizar assinatura:', updateSubscriptionError)
      throw new Error(`Erro ao atualizar assinatura: ${updateSubscriptionError.message}`)
    }
    
    console.log('Assinatura atualizada com sucesso');
  } else {
    console.log('Criando nova assinatura...');
    const { error: createSubscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: attemptData.user_id,
        plan_id: planId,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })

    if (createSubscriptionError) {
      console.error('Erro ao criar assinatura:', createSubscriptionError)
      throw new Error(`Erro ao criar assinatura: ${createSubscriptionError.message}`)
    }
    
    console.log('Nova assinatura criada com sucesso');
  }

  // Registrar um log financeiro
  console.log('Registrando log financeiro...');
  const { error: logError } = await supabase
    .from('financial_logs')
    .insert({
      user_id: attemptData.user_id,
      action: 'payment_processed',
      description: `Pagamento de ${attemptData.plan_name} processado com sucesso`,
      data: {
        payment_id: payment.id.toString(),
        amount: payment.transaction_amount || payment.transaction_details?.total_paid_amount,
        plan_name: attemptData.plan_name,
        plan_interval: attemptData.plan_interval
      }
    })

  if (logError) {
    console.error('Erro ao registrar log financeiro:', logError)
    // Não interromper o fluxo por erro no log
  } else {
    console.log('Log financeiro registrado com sucesso');
  }
  
  // Retornar uma resposta de sucesso
  return new Response(JSON.stringify({ success: true, status: 'approved' }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
