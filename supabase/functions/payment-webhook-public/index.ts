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
    // Extrair dados do objeto payment
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
    
    if (!userId) {
      console.error('ID de usuário não encontrado no pagamento')
      throw new Error('ID de usuário não encontrado no pagamento')
    }

    // Buscar a tentativa de pagamento usando user_id
    console.log('Buscando tentativa de pagamento no banco de dados usando user_id...');
    
    const { data: attemptData, error: attemptError } = await supabase
      .from('payment_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (attemptError) {
      console.error('Erro ao buscar tentativa de pagamento:', attemptError)
      throw new Error(`Erro ao buscar tentativa de pagamento: ${attemptError.message}`)
    }

    if (!attemptData) {
      console.error('Tentativa de pagamento não encontrada para o usuário:', userId)
      
      // Se não encontramos a tentativa, vamos criar um registro diretamente
      if (planId && planInterval) {
        console.log('Criando registro de pagamento diretamente dos metadados...');
        
        // Obter o plano
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', planId)
          .single()
          
        if (planError) {
          console.error('Erro ao buscar plano:', planError)
          throw new Error(`Erro ao buscar plano: ${planError.message}`)
        }
        
        if (!planData) {
          console.error('Plano não encontrado:', planId)
          throw new Error('Plano não encontrado')
        }
        
        return await createPaymentRecord(supabase, payment, {
          user_id: userId,
          plan_id: planId,
          plan_name: planData.name,
          plan_price: paymentAmount,
          plan_interval: planInterval
        })
      } else {
        throw new Error('Tentativa de pagamento não encontrada e metadados insuficientes')
      }
    }

    console.log('Tentativa de pagamento encontrada:', JSON.stringify(attemptData));

    // Atualizar o status da tentativa de pagamento
    const { error: updateError } = await supabase
      .from('payment_attempts')
      .update({ status: paymentStatus, updated_at: new Date().toISOString() })
      .eq('id', attemptData.id)

    if (updateError) {
      console.error('Erro ao atualizar tentativa de pagamento:', updateError)
      throw new Error(`Erro ao atualizar tentativa de pagamento: ${updateError.message}`)
    }

    console.log('Tentativa de pagamento atualizada com sucesso');

    // Se o pagamento foi aprovado, criar um registro na tabela payments e atualizar ou criar assinatura
    if (paymentStatus === 'approved') {
      return await createPaymentRecord(supabase, payment, attemptData)
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
      amount: paymentAmount,
      currency: 'BRL',
      payment_method: paymentMethod,
      transaction_id: paymentId,
      status: 'approved'
    })
    .select()
    .single()

  if (paymentError) {
    console.error('Erro ao criar registro de pagamento:', paymentError)
    throw new Error(`Erro ao criar registro de pagamento: ${paymentError.message}`)
  }

  console.log('Registro de pagamento criado:', JSON.stringify(paymentData));

  // Verificar se o usuário já tem uma assinatura ativa para esse plano
  console.log('Verificando assinatura existente...');
  const { data: subscriptionData, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', attemptData.user_id)
    .eq('plan_id', attemptData.plan_id)
    .eq('status', 'active')
    .maybeSingle()

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
  if (subscriptionData) {
    console.log('Assinatura existente encontrada, atualizando...');
    const { error: updateSubscriptionError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        end_date: endDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionData.id)

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
        plan_id: attemptData.plan_id,
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
      amount: paymentAmount,
      reference_id: paymentId
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
