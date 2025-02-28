import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

// Obter as credenciais do Mercado Pago das variáveis de ambiente
const MP_CLIENT_ID = Deno.env.get('MP_PROD_CLIENT_ID') || ''
const MP_CLIENT_SECRET = Deno.env.get('MP_PROD_CLIENT_SECRET') || ''

console.log('Client ID disponível:', !!MP_CLIENT_ID);
console.log('Client Secret disponível:', !!MP_CLIENT_SECRET);

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

    // Extrair o token de autorização
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autorização não fornecido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token de autorização inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Verificar o JWT para obter o usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obter dados do corpo da requisição
    const { planId, planName, planPrice, planInterval, userName } = await req.json()

    // Validar os dados do plano
    if (!planId || !planPrice || !planInterval) {
      return new Response(JSON.stringify({ error: 'Dados do plano incompletos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obter um token válido para o Mercado Pago
    const accessToken = await getValidToken();

    // Criar preferência de pagamento usando fetch diretamente
    console.log('Tentando criar preferência de pagamento com o Mercado Pago');
    
    // Imprimir o cabeçalho de autorização para depuração
    console.log('Cabeçalho de autorização: Bearer ' + accessToken.substring(0, 10) + '...');
    
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        items: [
          {
            id: planId,
            title: planName || 'Assinatura Maguinho',
            description: `Assinatura ${planInterval} do Maguinho`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: planPrice
          }
        ],
        payer: {
          name: userName || user.email || 'Usuário',
          email: user.email
        },
        back_urls: {
          success: 'https://maguinho.com/dashboard',
          failure: 'https://maguinho.com/subscription',
          pending: 'https://maguinho.com/subscription'
        },
        auto_return: 'approved',
        statement_descriptor: 'MAGUINHO',
        external_reference: user.id,
        metadata: {
          user_id: user.id,
          plan_id: planId,
          plan_interval: planInterval
        }
      })
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('Erro do Mercado Pago:', errorData);
      
      // Se o token falhou, limpar o cache e tentar novamente com um novo token
      if (errorData.status === 401) {
        console.log('Token inválido, gerando um novo token');
        cachedToken = null;
        
        const newToken = await getAccessToken();
        
        console.log('Tentando novamente com o novo token');
        const retryResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`
          },
          body: JSON.stringify({
            items: [
              {
                id: planId,
                title: planName || 'Assinatura Maguinho',
                description: `Assinatura ${planInterval} do Maguinho`,
                quantity: 1,
                currency_id: 'BRL',
                unit_price: planPrice
              }
            ],
            payer: {
              name: userName || user.email || 'Usuário',
              email: user.email
            },
            back_urls: {
              success: 'https://maguinho.com/dashboard',
              failure: 'https://maguinho.com/subscription',
              pending: 'https://maguinho.com/subscription'
            },
            auto_return: 'approved',
            statement_descriptor: 'MAGUINHO',
            external_reference: user.id,
            metadata: {
              user_id: user.id,
              plan_id: planId,
              plan_interval: planInterval
            }
          })
        });
        
        if (retryResponse.ok) {
          const retryResult = await retryResponse.json();
          console.log('Preferência criada com sucesso após retry:', retryResult.id);
          
          // Registrar a tentativa de pagamento no banco de dados
          await supabase.from('payment_attempts').insert({
            user_id: user.id,
            preference_id: retryResult.id,
            plan_id: planId,
            plan_name: planName,
            plan_price: planPrice,
            plan_interval: planInterval,
            status: 'pending'
          });
          
          return new Response(JSON.stringify({ preferenceId: retryResult.id }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          const retryErrorData = await retryResponse.json();
          console.error('Erro do Mercado Pago após retry:', retryErrorData);
        }
      }
      
      throw new Error(errorData.message || 'Erro ao criar preferência de pagamento');
    }

    const result = await mpResponse.json();
    console.log('Preferência criada com sucesso:', result.id);

    // Registrar a tentativa de pagamento no banco de dados
    await supabase.from('payment_attempts').insert({
      user_id: user.id,
      preference_id: result.id,
      plan_id: planId,
      plan_name: planName,
      plan_price: planPrice,
      plan_interval: planInterval,
      status: 'pending'
    })

    return new Response(JSON.stringify({ preferenceId: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Erro ao processar pagamento:', error)
    
    return new Response(JSON.stringify({ error: 'Erro ao processar pagamento' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
