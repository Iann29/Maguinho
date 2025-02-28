import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const MP_ENVIRONMENT = Deno.env.get('MP_ENVIRONMENT') || 'TEST'
const MP_ACCESS_TOKEN = MP_ENVIRONMENT === 'TEST' 
  ? Deno.env.get('MP_TEST_ACCESS_TOKEN') || ''
  : Deno.env.get('MP_PROD_ACCESS_TOKEN') || ''

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

    // Criar preferência de pagamento usando fetch diretamente
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
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
      throw new Error(errorData.message || 'Erro ao criar preferência de pagamento');
    }

    const result = await mpResponse.json();

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
