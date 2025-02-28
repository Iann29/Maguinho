import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') || ''
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

    // Verificar a assinatura do webhook (opcional, mas recomendado para segurança)
    const webhookSignature = req.headers.get('X-Signature')
    if (MP_WEBHOOK_SECRET && webhookSignature) {
      // Verificação básica da assinatura - em produção, você deve implementar
      // a verificação completa conforme a documentação do Mercado Pago
      if (webhookSignature !== MP_WEBHOOK_SECRET) {
        console.error('Assinatura do webhook inválida');
        return new Response(JSON.stringify({ error: 'Assinatura inválida' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Obter dados do corpo da requisição
    const data = await req.json()
    console.log('Webhook recebido:', JSON.stringify(data, null, 2))
    
    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Processar a notificação
    if (data.type === 'payment') {
      const paymentId = data.data.id
      
      // Buscar detalhes do pagamento na API do Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
      })
      
      if (!paymentResponse.ok) {
        console.error('Erro ao obter detalhes do pagamento:', await paymentResponse.text())
        throw new Error('Erro ao obter detalhes do pagamento')
      }
      
      const paymentDetails = await paymentResponse.json()
      console.log('Detalhes do pagamento:', JSON.stringify(paymentDetails, null, 2))
      
      // Obter o preference_id e o status do pagamento
      const preferenceId = paymentDetails.preference_id
      const status = paymentDetails.status // 'approved', 'rejected', 'pending', etc.
      
      // Atualizar o status da tentativa de pagamento
      const { data: paymentAttempt, error: paymentAttemptError } = await supabase
        .from('payment_attempts')
        .update({ status: status })
        .eq('preference_id', preferenceId)
        .select('*')
        .single()
        
      if (paymentAttemptError) {
        console.error('Erro ao atualizar tentativa de pagamento:', paymentAttemptError)
        return new Response(JSON.stringify({ error: 'Erro ao processar webhook' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Se o pagamento foi aprovado, criar ou atualizar a assinatura
      if (status === 'approved' && paymentAttempt) {
        // Calcular data de término com base no intervalo
        let endDate = new Date()
        switch (paymentAttempt.plan_interval) {
          case 'mensal':
            endDate.setMonth(endDate.getMonth() + 1)
            break
          case 'trimestral':
            endDate.setMonth(endDate.getMonth() + 3)
            break
          case 'anual':
            endDate.setFullYear(endDate.getFullYear() + 1)
            break
          default:
            endDate.setMonth(endDate.getMonth() + 1)
        }
        
        // Verificar se já existe uma assinatura para o usuário
        const { data: existingSubscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', paymentAttempt.user_id)
          .single()
          
        if (existingSubscription) {
          // Atualizar assinatura existente
          await supabase
            .from('subscriptions')
            .update({
              plan_id: paymentAttempt.plan_id,
              plan_name: paymentAttempt.plan_name,
              plan_price: paymentAttempt.plan_price,
              plan_interval: paymentAttempt.plan_interval,
              status: 'active',
              start_date: new Date(),
              end_date: endDate,
              payment_id: paymentId
            })
            .eq('user_id', paymentAttempt.user_id)
        } else {
          // Criar nova assinatura
          await supabase
            .from('subscriptions')
            .insert({
              user_id: paymentAttempt.user_id,
              plan_id: paymentAttempt.plan_id,
              plan_name: paymentAttempt.plan_name,
              plan_price: paymentAttempt.plan_price,
              plan_interval: paymentAttempt.plan_interval,
              status: 'active',
              start_date: new Date(),
              end_date: endDate,
              payment_id: paymentId
            })
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    
    return new Response(JSON.stringify({ error: 'Erro ao processar webhook' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
