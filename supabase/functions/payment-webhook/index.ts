import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

// Obter as credenciais do Mercado Pago das variáveis de ambiente
const MP_CLIENT_ID = Deno.env.get('MP_PROD_CLIENT_ID') || ''
const MP_CLIENT_SECRET = Deno.env.get('MP_PROD_CLIENT_SECRET') || ''
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') || ''

console.log('Iniciando webhook...');
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

    // Log completo do cabeçalho da requisição para diagnóstico
    console.log('Headers da requisição:', JSON.stringify(Object.fromEntries(req.headers.entries())));

    // Removida verificação de assinatura temporariamente para diagnóstico

    // Obter dados do corpo da requisição
    let requestData;
    try {
      requestData = await req.json();
      console.log('Dados do webhook recebidos:', JSON.stringify(requestData));
    } catch (error) {
      console.error('Erro ao processar o corpo da requisição:', error);
      return new Response(JSON.stringify({ error: 'Erro ao processar o corpo da requisição' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar se é uma notificação de pagamento
    console.log('Tipo de notificação:', requestData.type);
    if (requestData.type !== 'payment' && requestData.action !== 'payment.created') {
      console.log('Tipo de notificação não suportado ou não reconhecido:', requestData.type, requestData.action);
      return new Response(JSON.stringify({ message: 'Tipo de notificação não suportado ou não reconhecido' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obter o ID do pagamento
    const paymentId = requestData.data?.id;
    console.log('ID do pagamento extraído:', paymentId);
    if (!paymentId) {
      console.error('ID de pagamento não encontrado na notificação');
      return new Response(JSON.stringify({ error: 'ID de pagamento não encontrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obter um token válido para o Mercado Pago
    console.log('Obtendo token para API do Mercado Pago');
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
      console.error('Erro ao obter detalhes do pagamento. Status:', paymentResponse.status, 'Erro:', JSON.stringify(errorData))
      
      // Se o token falhou, limpar o cache e tentar novamente com um novo token
      if (errorData.status === 401) {
        console.log('Token inválido, gerando um novo token');
        cachedToken = null;
        
        const newToken = await getAccessToken();
        console.log('Novo token gerado, tentando novamente');
        
        console.log('Tentando novamente com o novo token');
        const retryResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${newToken}`
          }
        });
        
        if (!retryResponse.ok) {
          const retryErrorData = await retryResponse.json();
          console.error('Erro ao obter detalhes do pagamento após retry. Status:', retryResponse.status, 'Erro:', JSON.stringify(retryErrorData));
          throw new Error(retryErrorData.message || 'Erro ao obter detalhes do pagamento');
        }
        
        console.log('Conseguiu obter detalhes após retry');
        const payment = await retryResponse.json();
        console.log('Dados do pagamento obtidos (retry):', JSON.stringify(payment));
        return await processPayment(payment);
      }
      
      throw new Error(errorData.message || 'Erro ao obter detalhes do pagamento')
    }

    const payment = await paymentResponse.json()
    console.log('Dados do pagamento obtidos:', JSON.stringify(payment));
    return await processPayment(payment);

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
    // Obter a preferência de pagamento
    const preferenceId = payment.preference_id
    console.log('Preference ID encontrado:', preferenceId);
    
    if (!preferenceId) {
      console.error('ID de preferência não encontrado no pagamento')
      throw new Error('ID de preferência não encontrado no pagamento')
    }

    // Buscar a tentativa de pagamento para atualizar o status
    console.log('Buscando tentativa de pagamento no banco de dados...');
    const { data: attemptData, error: attemptError } = await supabase
      .from('payment_attempts')
      .select('*')
      .eq('preference_id', preferenceId)
      .single()

    if (attemptError) {
      console.error('Erro ao buscar tentativa de pagamento:', attemptError)
      throw new Error(`Erro ao buscar tentativa de pagamento: ${attemptError.message}`)
    }

    if (!attemptData) {
      console.error('Tentativa de pagamento não encontrada para a preferência:', preferenceId)
      throw new Error('Tentativa de pagamento não encontrada')
    }

    console.log('Tentativa de pagamento encontrada:', JSON.stringify(attemptData));

    // Atualizar o status da tentativa de pagamento
    const paymentStatus = payment.status
    console.log('Status do pagamento:', paymentStatus);
    
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
      console.log('Pagamento aprovado, criando registro na tabela payments');
      
      // Criar um registro de pagamento
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: attemptData.user_id,
          amount: attemptData.plan_price,
          currency: 'BRL',
          payment_method: payment.payment_method_id || 'mercado_pago',
          transaction_id: payment.id.toString(),
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
          amount: attemptData.plan_price,
          reference_id: payment.id.toString()
        })

      if (logError) {
        console.error('Erro ao registrar log financeiro:', logError)
        // Não interromper o fluxo por erro no log
      } else {
        console.log('Log financeiro registrado com sucesso');
      }
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
