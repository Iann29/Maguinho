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

// Obter detalhes completos do pagamento do Mercado Pago
async function getPaymentDetails(paymentId: string, accessToken: string): Promise<any> {
  console.log(`Obtendo detalhes do pagamento ${paymentId} do Mercado Pago...`);
  
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao obter detalhes do pagamento:', errorData);
      throw new Error(`Erro ao obter detalhes do pagamento: ${errorData.message || response.statusText}`);
    }
    
    const paymentData = await response.json();
    console.log('Detalhes do pagamento obtidos com sucesso');
    return paymentData;
  } catch (error) {
    console.error('Erro ao obter detalhes do pagamento:', error);
    throw error;
  }
}

// Obter detalhes da assinatura (preapproval) do Mercado Pago
async function getSubscriptionDetails(subscriptionId: string, accessToken: string): Promise<any> {
  console.log(`Obtendo detalhes da assinatura ${subscriptionId} do Mercado Pago...`);
  
  try {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao obter detalhes da assinatura:', errorData);
      throw new Error(`Erro ao obter detalhes da assinatura: ${errorData.message || response.statusText}`);
    }
    
    const subscriptionData = await response.json();
    console.log('Detalhes da assinatura obtidos com sucesso');
    return subscriptionData;
  } catch (error) {
    console.error('Erro ao obter detalhes da assinatura:', error);
    throw error;
  }
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
          message: 'Pagamento de teste detectado. Notificação recebida com sucesso.',
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
    return await processPayment(paymentDetails.id);

  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    
    return new Response(JSON.stringify({ error: 'Erro ao processar webhook', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Função para processar o pagamento e atualizar o banco de dados
async function processPayment(paymentId: string): Promise<void> {
  console.log('Processando pagamento:', paymentId);
  
  // Obter um token válido para o Mercado Pago
  const accessToken = await getValidToken();
  
  // Obter detalhes completos do pagamento
  const paymentDetails = await getPaymentDetails(paymentId, accessToken);
  console.log('Detalhes do pagamento:', JSON.stringify(paymentDetails).substring(0, 200) + '...');
  
  // Extrair informações relevantes do pagamento
  const payment = {
    id: paymentDetails.id,
    status: paymentDetails.status,
    status_detail: paymentDetails.status_detail,
    external_reference: paymentDetails.external_reference,
    payment_method_id: paymentDetails.payment_method_id,
    payment_type_id: paymentDetails.payment_type_id,
    transaction_amount: paymentDetails.transaction_amount,
    date_created: paymentDetails.date_created,
    date_approved: paymentDetails.date_approved,
    payer: paymentDetails.payer,
    metadata: paymentDetails.metadata || {},
    preapproval_id: paymentDetails.preapproval_id || null,
    subscription_id: paymentDetails.id  // Usar o ID do pagamento como subscription_id
  };

  // Extrair informações dos metadados
  const metadata = payment.metadata || {};
  console.log('- metadata completo:', JSON.stringify(metadata));
  
  const userId = metadata.user_id || payment.external_reference;
  const planId = metadata.plan_id;
  const planInterval = metadata.plan_interval || 'mensal';
  
  console.log('- user_id:', userId);
  console.log('- plan_id:', planId);
  console.log('- plan_interval:', planInterval);
  
  // Extrair nome do plano dos metadados ou da descrição do pagamento
  let planName = null;
  
  // Verificar se o plan_id contém informações sobre o nome do plano
  if (planId) {
    if (planId.toLowerCase().includes('premium')) {
      planName = 'Plano Premium';
      console.log('Nome do plano extraído do plan_id: Plano Premium');
    } else if (planId.toLowerCase().includes('basico')) {
      planName = 'Plano Básico';
      console.log('Nome do plano extraído do plan_id: Plano Básico');
    }
  }
  
  // Verificar se há informações na descrição do pagamento
  if (!planName && paymentDetails.description) {
    if (paymentDetails.description.toLowerCase().includes('premium')) {
      planName = 'Plano Premium';
      console.log('Nome do plano extraído da descrição: Plano Premium');
    } else if (paymentDetails.description.toLowerCase().includes('básico') || paymentDetails.description.toLowerCase().includes('basico')) {
      planName = 'Plano Básico';
      console.log('Nome do plano extraído da descrição: Plano Básico');
    }
  }
  
  // Criar cliente Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    console.log('Dados extraídos do pagamento:');
    console.log('- ID:', payment.id);
    console.log('- Status:', payment.status);
    console.log('- Valor:', payment.transaction_amount);
    console.log('- Método:', payment.payment_method_id);
    console.log('- user_id:', userId);
    console.log('- plan_id:', planId);
    console.log('- plan_interval:', planInterval);
    console.log('- live_mode:', paymentDetails.live_mode);
    console.log('- metadata completo:', JSON.stringify(payment.metadata));
    console.log('- external_reference:', payment.external_reference);
    
    // Verificar se é um pagamento de teste (ID 123456 ou live_mode=false)
    const isTestPayment = paymentId === '123456' || (paymentDetails.live_mode !== undefined && paymentDetails.live_mode === false);
    
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

    // Buscar a tentativa de pagamento usando user_id e preference_id (se disponível)
    console.log('Buscando tentativa de pagamento no banco de dados...');
    
    let attemptQuery = supabase
      .from('payment_attempts')
      .select('*')
      .eq('user_id', userId);
      
    // Se tivermos uma referência externa, usar como critério adicional
    if (payment.external_reference) {
      console.log('Usando external_reference como critério adicional:', payment.external_reference);
      // Tentar buscar pela preference_id que deve corresponder ao external_reference
      attemptQuery = attemptQuery.eq('preference_id', payment.external_reference);
    }
    
    // Ordenar por data de criação (mais recente primeiro) e pegar a primeira
    const { data: attemptData, error: attemptError } = await attemptQuery
      .order('created_at', { ascending: false })
      .limit(1);

    if (attemptError) {
      console.error('Erro ao buscar tentativa de pagamento:', attemptError)
      throw new Error(`Erro ao buscar tentativa de pagamento: ${attemptError.message}`)
    }

    if (!attemptData || attemptData.length === 0) {
      console.log('Tentativa de pagamento não encontrada para o usuário:', userId)
      
      // Se o pagamento foi aprovado, atualizar todas as tentativas pendentes deste usuário
      if (payment.status === 'approved') {
        console.log('Atualizando todas as tentativas pendentes do usuário...');
        
        const { data: updatedAttempts, error: updateAttemptsError } = await supabase
          .from('payment_attempts')
          .update({ 
            status: 'cancelled', 
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', userId)
          .eq('status', 'pending')
          .select();
          
        if (updateAttemptsError) {
          console.error('Erro ao atualizar tentativas pendentes:', updateAttemptsError);
          // Não interromper o fluxo por erro nesta atualização
        } else {
          console.log(`${updatedAttempts?.length || 0} tentativas pendentes atualizadas com sucesso`);
        }
      }
      
      // Se não encontramos a tentativa, vamos criar um registro diretamente
      if (planId && planInterval) {
        console.log('Criando registro de pagamento diretamente dos metadados...');
        
        // Obter o plano
        let planQuery = supabase
          .from('plans')
          .select('*')
          .eq('active', true);
          
        // Se o plan_id parece ser um nome de plano (não um UUID), buscar pelo nome também
        if (planId && !planId.includes('-')) {
          // Extrair o nome do plano do plan_id (ex: "plano_premium_mensal" -> "premium")
          const planNameFromId = planId.replace('plano_', '').replace('_mensal', '').replace('_anual', '');
          console.log(`Buscando plano pelo nome extraído: ${planNameFromId}`);
          
          planQuery = planQuery.ilike('name', `%${planNameFromId}%`);
        }
        
        // Adicionar filtro de intervalo
        planQuery = planQuery.eq('billing_interval', planInterval).limit(1);
        
        const { data: planData, error: planError } = await planQuery;
        
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
          plan_name: planName || plano.name, // Usar o nome extraído dos metadados se disponível
          plan_price: payment.transaction_amount,
          plan_interval: planInterval
        })
      } else {
        // Tentar criar um registro básico mesmo sem os metadados completos
        console.log('Tentando criar registro básico sem metadados completos...');
        
        // Verificar se o usuário já tem uma assinatura que possamos usar
        const { data: existingSubscription, error: existingSubscriptionError } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);
          
        let subscriptionId = null;
        
        if (!existingSubscriptionError && existingSubscription && existingSubscription.length > 0) {
          // Usar a assinatura existente
          subscriptionId = existingSubscription[0].id;
          console.log(`Usando assinatura existente (ID: ${subscriptionId}) para o pagamento sem metadados completos`);
        } else {
          // Criar uma assinatura básica
          console.log('Criando assinatura básica para o pagamento sem metadados completos...');
          
          // Buscar um plano ativo para usar
          const { data: anyPlan, error: anyPlanError } = await supabase
            .from('plans')
            .select('id')
            .eq('active', true)
            .limit(1);
            
          if (!anyPlanError && anyPlan && anyPlan.length > 0) {
            const startDate = new Date();
            let endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1); // Assumir mensal por padrão
            
            const { data: newSubscription, error: newSubscriptionError } = await supabase
              .from('subscriptions')
              .insert({
                user_id: userId,
                plan_id: anyPlan[0].id,
                status: 'active',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                subscription_id: paymentId
              })
              .select();
              
            if (!newSubscriptionError && newSubscription && newSubscription.length > 0) {
              subscriptionId = newSubscription[0].id;
              console.log(`Nova assinatura básica criada (ID: ${subscriptionId})`);
            } else {
              console.error('Erro ao criar assinatura básica:', newSubscriptionError);
            }
          } else {
            console.error('Nenhum plano ativo encontrado para criar assinatura básica');
          }
        }
        
        // Criar registro de pagamento simples
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: userId,
            amount: payment.transaction_amount,
            currency: 'BRL',
            payment_method: payment.payment_method_id,
            transaction_id: paymentId,
            status: 'approved',
            subscription_id: subscriptionId // Usar o ID da assinatura criada ou existente
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
            description: `Pagamento recebido via webhook (sem metadados completos)`,
            data: { payment_id: paymentId, amount: payment.transaction_amount }
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

    // Atualizar o status da tentativa de pagamento atual
    const { error: updateError } = await supabase
      .from('payment_attempts')
      .update({ status: payment.status, updated_at: new Date().toISOString() })
      .eq('id', attemptData[0].id)

    if (updateError) {
      console.error('Erro ao atualizar tentativa de pagamento:', updateError)
      throw new Error(`Erro ao atualizar tentativa de pagamento: ${updateError.message}`)
    }

    console.log('Tentativa de pagamento atualizada com sucesso');
    
    // Se o pagamento foi aprovado, atualizar todas as outras tentativas pendentes deste usuário
    if (payment.status === 'approved') {
      console.log('Atualizando outras tentativas pendentes do usuário...');
      
      // Atualizar todas as tentativas pendentes do usuário, exceto a atual
      const { data: updatedAttempts, error: updateOtherAttemptsError } = await supabase
        .from('payment_attempts')
        .update({ 
          status: 'cancelled', 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', attemptData[0].user_id)
        .eq('status', 'pending')
        .neq('id', attemptData[0].id)
        .select();
        
      if (updateOtherAttemptsError) {
        console.error('Erro ao atualizar outras tentativas pendentes:', updateOtherAttemptsError);
        // Não interromper o fluxo por erro nesta atualização
      } else {
        console.log(`${updatedAttempts?.length || 0} outras tentativas pendentes atualizadas com sucesso`);
      }
      
      return await createPaymentRecord(supabase, payment, attemptData[0])
    }

    // Retornar uma resposta de sucesso
    return new Response(JSON.stringify({ success: true, status: payment.status }), {
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
  
  // Primeiro, vamos criar ou atualizar a assinatura para obter o ID
  let subscriptionId = null;
  
  // Verificar se o usuário já tem uma assinatura ativa para esse plano
  console.log('Verificando assinatura existente...');
  
  // Buscar plano pelo ID ou pelo intervalo
  let planId = attemptData.plan_id;
  
  if (!planId) {
    console.log('Plan ID não encontrado na tentativa, buscando pelo intervalo:', attemptData.plan_interval);
    
    // Obter o plano
    let planQuery = supabase
      .from('plans')
      .select('id')
      .eq('active', true);
      
    // Se temos um plan_id nos metadados da tentativa, verificar se é um nome de plano
    const attemptPlanId = attemptData.plan_id;
    if (attemptPlanId && !attemptPlanId.includes('-')) {
      // Extrair o nome do plano do plan_id (ex: "plano_premium_mensal" -> "premium")
      const planNameFromId = attemptPlanId.replace('plano_', '').replace('_mensal', '').replace('_anual', '');
      console.log(`Buscando plano pelo nome extraído: ${planNameFromId}`);
      
      planQuery = planQuery.ilike('name', `%${planNameFromId}%`);
    }
    
    // Adicionar filtro de intervalo
    planQuery = planQuery.eq('billing_interval', attemptData.plan_interval).limit(1);
    
    const { data: planData, error: planError } = await planQuery;
      
    if (planError) {
      console.error('Erro ao buscar plano pelo intervalo:', planError);
      throw new Error(`Erro ao buscar plano pelo intervalo: ${planError.message}`);
    }
    
    if (planData && planData.length > 0) {
      planId = planData[0].id;
      console.log('Plano encontrado pelo intervalo:', planId);
    } else {
      console.error('Nenhum plano encontrado para o intervalo:', attemptData.plan_interval);
      throw new Error('Nenhum plano encontrado para o intervalo especificado');
    }
  }
  
  const { data: subscriptionData, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', attemptData.user_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (subscriptionError) {
    console.error('Erro ao verificar assinatura existente:', subscriptionError);
    throw new Error(`Erro ao verificar assinatura existente: ${subscriptionError.message}`);
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
    console.log(`Assinatura existente encontrada (ID: ${subscriptionData[0].id}), atualizando...`);
    const { data: updatedSubscription, error: updateSubscriptionError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        end_date: endDate.toISOString(),
        updated_at: new Date().toISOString(),
        plan_id: planId  // Atualizar o plano se necessário
      })
      .eq('id', subscriptionData[0].id)
      .select();

    if (updateSubscriptionError) {
      console.error('Erro ao atualizar assinatura:', updateSubscriptionError)
      throw new Error(`Erro ao atualizar assinatura: ${updateSubscriptionError.message}`)
    }
    
    console.log(`Assinatura atualizada com sucesso (ID: ${subscriptionData[0].id})`);
    subscriptionId = subscriptionData[0].id;
  } else {
    // Verificar se existe alguma assinatura inativa para o usuário que podemos reativar
    const { data: inactiveSubscriptionData, error: inactiveSubscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', attemptData.user_id)
      .neq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (inactiveSubscriptionError) {
      console.error('Erro ao verificar assinaturas inativas:', inactiveSubscriptionError);
    }
    
    if (!inactiveSubscriptionError && inactiveSubscriptionData && inactiveSubscriptionData.length > 0) {
      console.log(`Assinatura inativa encontrada (ID: ${inactiveSubscriptionData[0].id}), reativando...`);
      const { data: reactivatedSubscription, error: reactivateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          plan_id: planId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', inactiveSubscriptionData[0].id)
        .select();
        
      if (reactivateError) {
        console.error('Erro ao reativar assinatura:', reactivateError);
        // Continuar com a criação de uma nova assinatura
      } else {
        console.log(`Assinatura reativada com sucesso (ID: ${inactiveSubscriptionData[0].id})`);
        subscriptionId = inactiveSubscriptionData[0].id;
      }
    }
    
    // Se não encontrou assinatura ativa ou inativa para reativar, criar uma nova
    if (!subscriptionId) {
      console.log('Nenhuma assinatura encontrada, criando nova...');
      const { data: newSubscription, error: createSubscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: attemptData.user_id,
          plan_id: planId,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          subscription_id: payment.id // Adicionar o ID do pagamento como referência externa
        })
        .select();

      if (createSubscriptionError) {
        console.error('Erro ao criar assinatura:', createSubscriptionError)
        throw new Error(`Erro ao criar assinatura: ${createSubscriptionError.message}`)
      }
      
      if (newSubscription && newSubscription.length > 0) {
        subscriptionId = newSubscription[0].id;
        console.log(`Nova assinatura criada com sucesso (ID: ${subscriptionId})`);
      } else {
        console.log('Nova assinatura criada, mas não foi possível recuperar o ID');
      }
    }
  }
      
  // Criar um registro de pagamento
  const { data: paymentData, error: paymentError } = await supabase
    .from('payments')
    .insert({
      user_id: attemptData.user_id,
      amount: payment.transaction_amount,
      currency: 'BRL',
      payment_method: payment.payment_method_id,
      transaction_id: payment.id,
      status: 'approved',
      subscription_id: subscriptionId  // Usar o ID da assinatura do nosso banco
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

  // Registrar um log financeiro
  console.log('Registrando log financeiro...');
  
  // Verificar se o nome do plano está correto com base no valor
  let planNameToUse = attemptData.plan_name || 'Plano';
  let planIntervalToUse = attemptData.plan_interval || 'mensal';
  
  // Se temos o ID do plano, buscar o nome diretamente
  if (planId) {
    const { data: planDetails, error: planDetailsError } = await supabase
      .from('plans')
      .select('name, billing_interval')
      .eq('id', planId)
      .limit(1);
      
    if (!planDetailsError && planDetails && planDetails.length > 0) {
      planNameToUse = planDetails[0].name;
      if (planDetails[0].billing_interval) {
        planIntervalToUse = planDetails[0].billing_interval;
      }
      console.log(`Nome do plano obtido diretamente pelo ID: ${planNameToUse} (${planIntervalToUse})`);
    }
  }
  // Se não temos o ID do plano ou não conseguimos obter o nome, tentar pelo valor
  else if (!attemptData.plan_price || payment.transaction_amount !== attemptData.plan_price) {
    console.log(`Valor do pagamento (${payment.transaction_amount}) difere do valor do plano informado (${attemptData.plan_price || 'não informado'}). Buscando plano correto...`);
    
    // Se ainda não encontrar, buscar todos os planos ativos para comparar
    const { data: allPlansData, error: allPlansError } = await supabase
      .from('plans')
      .select('id, name, price, billing_interval')
      .eq('active', true);
      
    if (!allPlansError && allPlansData && allPlansData.length > 0) {
      // Tentar encontrar o plano mais próximo com base no valor e intervalo
      console.log(`Buscando plano mais adequado entre ${allPlansData.length} planos ativos...`);
      
      // Primeiro, filtrar por intervalo se disponível
      let possiblePlans = allPlansData;
      if (attemptData.plan_interval) {
        possiblePlans = allPlansData.filter(p => p.billing_interval === attemptData.plan_interval);
      }
      
      if (possiblePlans.length > 0) {
        // Encontrar o plano com o valor mais próximo
        let closestPlan = possiblePlans[0];
        let minDiff = Math.abs(closestPlan.price - payment.transaction_amount);
        
        for (let i = 1; i < possiblePlans.length; i++) {
          const diff = Math.abs(possiblePlans[i].price - payment.transaction_amount);
          if (diff < minDiff) {
            minDiff = diff;
            closestPlan = possiblePlans[i];
          }
        }
        
        // Se a diferença for pequena (menos de 5%), considerar como o plano correto
        if (minDiff / payment.transaction_amount < 0.05) {
          planNameToUse = closestPlan.name;
          planIntervalToUse = closestPlan.billing_interval;
          console.log(`Plano mais próximo encontrado: ${planNameToUse} (${closestPlan.price} ${closestPlan.billing_interval})`);
        } else {
          console.log(`Nenhum plano próximo encontrado. Diferença mínima: ${minDiff}`);
        }
      }
    }
  }
  
  // Verificar se o plano é Premium com base no nome ou ID nos metadados
  if (attemptData.plan_id && attemptData.plan_id.toLowerCase().includes('premium')) {
    console.log('Detectado plano Premium nos metadados, ajustando nome...');
    planNameToUse = planNameToUse.includes('Premium') ? planNameToUse : 'Plano Premium';
  }
  
  console.log(`Nome final do plano para log financeiro: ${planNameToUse} (${planIntervalToUse})`);
  
  const { error: logError } = await supabase
    .from('financial_logs')
    .insert({
      user_id: attemptData.user_id,
      action: 'payment_processed',
      description: `Pagamento de ${planNameToUse} ${planIntervalToUse} processado com sucesso`,
      data: {
        payment_id: payment.id,
        amount: payment.transaction_amount,
        plan_name: planNameToUse,
        plan_interval: planIntervalToUse
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
