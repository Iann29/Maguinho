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
      // Implementar verificação de assinatura aqui
      // Este é um exemplo básico, você deve implementar a verificação correta
      // conforme a documentação do Mercado Pago
    }

    // Obter dados do corpo da requisição
    const data = await req.json()
    
    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Processar a notificação
    if (data.type === 'payment') {
      const paymentId = data.data.id
      
      // Obter detalhes do pagamento (você precisaria implementar esta função)
      // const paymentDetails = await getPaymentDetails(paymentId)
      
      // Simulação de detalhes do pagamento
      const paymentDetails = {
        status: data.action, // 'approved', 'rejected', 'pending'
        external_reference: data.user_id, // ID do usuário
        preference_id: data.preference_id
      }
      
      // Atualizar o status da tentativa de pagamento
      const { data: paymentAttempt, error: paymentAttemptError } = await supabase
        .from('payment_attempts')
        .update({ status: paymentDetails.status })
        .eq('preference_id', paymentDetails.preference_id)
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
      if (paymentDetails.status === 'approved' && paymentAttempt) {
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
