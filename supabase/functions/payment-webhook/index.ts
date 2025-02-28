import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

// Obter as credenciais do Mercado Pago das variáveis de ambiente
const MP_CLIENT_ID = Deno.env.get('MP_PROD_CLIENT_ID') || ''
const MP_CLIENT_SECRET = Deno.env.get('MP_PROD_CLIENT_SECRET') || ''
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') || ''

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
      throw new Error(errorData.message || 'Erro ao obter token de acesso');
    }

    const data = await response.json();
    console.log('Token de acesso obtido com sucesso');
    return data.access_token;
  } catch (error) {
    console.error('Erro ao obter token de acesso:', error);
    throw error;
  }
}

// Cache para o token de acesso
let cachedToken = null;
let tokenExpiry = 0;

// Função para obter um token válido, seja das variáveis de ambiente, do cache ou gerando um novo
async function getValidToken() {
  // Se temos um token em cache e ele ainda é válido, usamos ele
  const now = Date.now();
  if (cachedToken && tokenExpiry > now) {
    console.log('Usando token em cache');
    return cachedToken;
  }

  // Sempre geramos um novo token usando Client ID e Client Secret
  console.log('Gerando novo token com Client ID e Client Secret');
  const newToken = await getAccessToken();
  
  // Armazenamos o token em cache por 2 horas (7200000 ms)
  cachedToken = newToken;
  tokenExpiry = now + 7200000;
  
  return newToken;
}

serve(async (req) => {
  // Lidar com requisições OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar o método da requisição
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Log completo do cabeçalho da requisição para diagnóstico
    console.log('Headers da requisição:', JSON.stringify(Object.fromEntries(req.headers.entries())));

    // Verificar a assinatura do webhook se o segredo estiver configurado
    // Desabilitando temporariamente a verificação de assinatura para debug
    /*
    if (MP_WEBHOOK_SECRET) {
      const signature = req.headers.get('x-signature')
      if (!signature) {
        console.error('Assinatura do webhook não encontrada')
        return new Response(JSON.stringify({ error: 'Assinatura do webhook não encontrada' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Implementar verificação de assinatura aqui
      // ...
    }
    */

    // Obter dados do corpo da requisição
    const requestData = await req.json()
    console.log('Dados do webhook recebidos:', JSON.stringify(requestData))

    // Verificar se é uma notificação de pagamento
    if (requestData.type !== 'payment') {
      console.log('Tipo de notificação não suportado:', requestData.type)
      return new Response(JSON.stringify({ message: 'Tipo de notificação não suportado' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obter o ID do pagamento
    const paymentId = requestData.data?.id
    if (!paymentId) {
      console.error('ID de pagamento não encontrado na notificação')
      return new Response(JSON.stringify({ error: 'ID de pagamento não encontrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obter um token válido para o Mercado Pago
    const accessToken = await getValidToken();

    // Obter detalhes do pagamento da API do Mercado Pago
    console.log('Obtendo detalhes do pagamento:', paymentId)
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json()
      console.error('Erro ao obter detalhes do pagamento:', errorData)
      
      // Se o token falhou, limpar o cache e tentar novamente com um novo token
      if (errorData.status === 401) {
        console.log('Token inválido, gerando um novo token');
        cachedToken = null;
        
        const newToken = await getAccessToken();
        
        console.log('Tentando novamente com o novo token');
        const retryResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${newToken}`
          }
        });
        
        if (!retryResponse.ok) {
          const retryErrorData = await retryResponse.json();
          console.error('Erro ao obter detalhes do pagamento após retry:', retryErrorData);
          throw new Error(retryErrorData.message || 'Erro ao obter detalhes do pagamento');
        }
        
        const payment = await retryResponse.json();
        return await processPayment(payment);
      }
      
      throw new Error(errorData.message || 'Erro ao obter detalhes do pagamento')
    }

    const payment = await paymentResponse.json()
    return await processPayment(payment);

  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    
    return new Response(JSON.stringify({ error: 'Erro ao processar webhook' }), {
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

  // Obter a preferência de pagamento
  const preferenceId = payment.preference_id
  if (!preferenceId) {
    console.error('ID de preferência não encontrado no pagamento')
    return new Response(JSON.stringify({ error: 'ID de preferência não encontrado' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Buscar a tentativa de pagamento no banco de dados
  const { data: paymentAttempt, error: paymentAttemptError } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('preference_id', preferenceId)
    .single()

  if (paymentAttemptError || !paymentAttempt) {
    console.error('Tentativa de pagamento não encontrada:', preferenceId)
    return new Response(JSON.stringify({ error: 'Tentativa de pagamento não encontrada' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Mapear o status do pagamento do Mercado Pago para o nosso sistema
  let status = 'pending'
  switch (payment.status) {
    case 'approved':
      status = 'completed'
      break
    case 'pending':
    case 'in_process':
      status = 'pending'
      break
    case 'rejected':
    case 'cancelled':
    case 'refunded':
      status = 'failed'
      break
    default:
      status = 'pending'
  }

  // Atualizar o status da tentativa de pagamento
  const { error: updateError } = await supabase
    .from('payment_attempts')
    .update({
      status,
      payment_id: payment.id,
      payment_status: payment.status,
      payment_status_detail: payment.status_detail,
      payment_method: payment.payment_method_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentAttempt.id)

  if (updateError) {
    console.error('Erro ao atualizar tentativa de pagamento:', updateError)
    return new Response(JSON.stringify({ error: 'Erro ao atualizar tentativa de pagamento' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Se o pagamento foi aprovado, criar ou atualizar a assinatura do usuário
  if (status === 'completed') {
    // Obter a data de expiração com base no intervalo do plano
    const expiresAt = new Date()
    if (paymentAttempt.plan_interval === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    } else if (paymentAttempt.plan_interval === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      // Padrão: 30 dias
      expiresAt.setDate(expiresAt.getDate() + 30)
    }

    // Verificar se o usuário já tem uma assinatura
    const { data: existingSubscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', paymentAttempt.user_id)
      .single()

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Erro ao verificar assinatura existente:', subscriptionError)
      return new Response(JSON.stringify({ error: 'Erro ao verificar assinatura existente' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Criar ou atualizar a assinatura
    const subscriptionData = {
      user_id: paymentAttempt.user_id,
      plan_id: paymentAttempt.plan_id,
      plan_name: paymentAttempt.plan_name,
      plan_price: paymentAttempt.plan_price,
      plan_interval: paymentAttempt.plan_interval,
      status: 'active',
      starts_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      payment_attempt_id: paymentAttempt.id,
      payment_id: payment.id,
      updated_at: new Date().toISOString()
    }

    let subscriptionResult
    if (existingSubscription) {
      // Atualizar assinatura existente
      const { error: updateSubscriptionError } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', existingSubscription.id)

      if (updateSubscriptionError) {
        console.error('Erro ao atualizar assinatura:', updateSubscriptionError)
        return new Response(JSON.stringify({ error: 'Erro ao atualizar assinatura' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      subscriptionResult = { ...existingSubscription, ...subscriptionData }
    } else {
      // Criar nova assinatura
      const { data: newSubscription, error: createSubscriptionError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single()

      if (createSubscriptionError) {
        console.error('Erro ao criar assinatura:', createSubscriptionError)
        return new Response(JSON.stringify({ error: 'Erro ao criar assinatura' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      subscriptionResult = newSubscription
    }

    console.log('Assinatura criada/atualizada com sucesso:', subscriptionResult)
  }

  return new Response(JSON.stringify({ success: true, status }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
