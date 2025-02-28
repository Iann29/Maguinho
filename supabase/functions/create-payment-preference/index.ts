import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'
import { MercadoPagoConfig, Preference } from 'https://esm.sh/mercadopago@1.5.16'

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

    // Obter o token de autorização do cabeçalho
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Extrair o token JWT
    const token = authHeader.replace('Bearer ', '')

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

    // Configurar o Mercado Pago
    const mercadopago = new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN
    })

    // Criar preferência de pagamento
    const preference = new Preference(mercadopago)
    const preferenceData = {
      items: [
        {
          id: planId,
          title: `Maguinho - ${planName} (${planInterval})`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: planPrice
        }
      ],
      payer: {
        name: userName || user.email,
        email: user.email
      },
      back_urls: {
        success: `${req.headers.get('origin')}/subscription/success`,
        failure: `${req.headers.get('origin')}/subscription/failure`,
        pending: `${req.headers.get('origin')}/subscription/pending`
      },
      auto_return: 'approved',
      external_reference: user.id,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        plan_interval: planInterval
      }
    }

    const result = await preference.create({ body: preferenceData })

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
