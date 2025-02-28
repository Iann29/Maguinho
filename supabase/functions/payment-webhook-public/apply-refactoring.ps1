# Script para aplicar a refatoração
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$originalFile = "index.ts"
$backupFile = "index.ts.backup_$timestamp"
$refactoredContent = "index.ts.refactored"

# Verificar se já existe um backup
if (-not (Test-Path -Path "$originalFile.backup_*")) {
    # Criar backup se não existir
    Copy-Item -Path $originalFile -Destination $backupFile
    Write-Host "Backup do arquivo original criado: $backupFile"
}

# Criar arquivo temporário com o conteúdo refatorado
$refactoredCode = @'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  getValidToken, 
  getPaymentDetails, 
  getSubscriptionDetails 
} from './mercadopago.ts'
import { 
  getSupabaseClient,
  findPaymentAttempt,
  updatePaymentAttemptStatus,
  updateAllPendingAttempts
} from './database.ts'
import {
  manageSubscription,
  createPaymentRecord,
  registerFinancialLog,
  identifyCorrectPlan
} from './payment-processor.ts'
import { MercadoPagoPayment, PaymentMetadata } from './types.ts'

// Obter as credenciais do Mercado Pago das variáveis de ambiente
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') || ''

console.log('Iniciando webhook-public...')
console.log('Ambiente:', Deno.env.get('DENO_ENV'))
console.log('Webhook Secret disponível:', !!MP_WEBHOOK_SECRET)

/**
 * Processa um pagamento recebido do Mercado Pago
 * @param paymentId ID do pagamento
 */
async function processPayment(paymentId: string): Promise<void> {
  console.log(`Processando pagamento ${paymentId}...`)
  const supabase = getSupabaseClient()
  
  try {
    // Obter token de acesso para a API do Mercado Pago
    const accessToken = await getValidToken()
    
    // Obter detalhes completos do pagamento
    const payment = await getPaymentDetails(paymentId, accessToken)
    
    // Verificar se o pagamento está aprovado
    if (payment.status !== 'approved') {
      console.log(`Pagamento ${paymentId} não está aprovado (status: ${payment.status}), ignorando...`)
      return
    }
    
    console.log(`Pagamento ${paymentId} aprovado, processando...`)
    
    // Extrair metadados do pagamento
    const metadata: PaymentMetadata = {
      user_id: payment.external_reference || '',
      ...payment.metadata
    }
    
    // Verificar se temos o ID do usuário
    if (!metadata.user_id) {
      console.error('ID do usuário não encontrado nos metadados')
      return
    }
    
    // Buscar tentativa de pagamento correspondente
    const attemptData = await findPaymentAttempt(supabase, paymentId, metadata.user_id)
    
    // Se encontrou uma tentativa, atualizar seu status
    if (attemptData) {
      await updatePaymentAttemptStatus(supabase, attemptData.id, 'approved')
      
      // Atualizar todas as outras tentativas pendentes do usuário
      const updatedCount = await updateAllPendingAttempts(supabase, metadata.user_id, 'superseded')
      console.log(`${updatedCount} tentativas pendentes adicionais atualizadas para 'superseded'`)
      
      // Completar metadados com informações da tentativa
      if (!metadata.plan_id && attemptData.plan_id) {
        metadata.plan_id = attemptData.plan_id
      }
      if (!metadata.plan_name && attemptData.plan_name) {
        metadata.plan_name = attemptData.plan_name
      }
      if (!metadata.plan_interval && attemptData.plan_interval) {
        metadata.plan_interval = attemptData.plan_interval
      }
    } else {
      console.log(`Nenhuma tentativa de pagamento encontrada para o pagamento ${paymentId}`)
    }
    
    // Identificar o plano correto
    const { id: planId, name: planName, interval: planInterval } = 
      await identifyCorrectPlan(supabase, payment, metadata)
    
    // Atualizar metadados com as informações do plano
    metadata.plan_id = planId
    metadata.plan_name = planName
    metadata.plan_interval = planInterval
    
    // Gerenciar a assinatura (criar, atualizar ou reativar)
    const subscriptionId = await manageSubscription(supabase, payment, metadata)
    
    // Criar registro de pagamento
    await createPaymentRecord(supabase, payment, metadata, subscriptionId)
    
    // Registrar log financeiro
    await registerFinancialLog(supabase, payment, metadata, planName, planInterval)
    
    console.log(`Processamento do pagamento ${paymentId} concluído com sucesso`)
  } catch (error) {
    console.error(`Erro ao processar pagamento ${paymentId}:`, error)
  }
}

/**
 * Processa uma notificação de assinatura do Mercado Pago
 * @param subscriptionId ID da assinatura
 */
async function processSubscription(subscriptionId: string): Promise<void> {
  console.log(`Processando assinatura ${subscriptionId}...`)
  
  try {
    // Obter token de acesso para a API do Mercado Pago
    const accessToken = await getValidToken()
    
    // Obter detalhes da assinatura
    const subscription = await getSubscriptionDetails(subscriptionId, accessToken)
    
    // Verificar status da assinatura
    console.log(`Status da assinatura ${subscriptionId}: ${subscription.status}`)
    
    // Implementar lógica adicional para lidar com assinaturas
    // Por enquanto, apenas logamos os detalhes
    console.log(`Detalhes da assinatura ${subscriptionId}:`, JSON.stringify(subscription))
  } catch (error) {
    console.error(`Erro ao processar assinatura ${subscriptionId}:`, error)
  }
}

// Função principal do webhook
serve(async (req) => {
  // Lidar com requisições OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Log da requisição recebida para diagnóstico
  console.log('Requisição recebida:')
  console.log('- Método:', req.method)
  console.log('- URL:', req.url)
  
  try {
    // Verificar o método da requisição
    if (req.method !== 'POST') {
      console.log('Método não permitido:', req.method)
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obter o corpo da requisição
    const body = await req.json()
    console.log('Corpo da requisição:', JSON.stringify(body))

    // Verificar a assinatura do webhook (se configurada)
    if (MP_WEBHOOK_SECRET) {
      const signature = req.headers.get('x-signature') || ''
      // Implementar verificação da assinatura aqui
      // Por enquanto, apenas logamos
      console.log('Assinatura do webhook:', signature)
    }

    // Verificar o tipo de notificação
    const type = body.type || body.action
    console.log('Tipo de notificação:', type)

    // Processar com base no tipo de notificação
    if (type === 'payment') {
      const paymentId = body.data?.id
      if (paymentId) {
        await processPayment(paymentId)
      } else {
        console.error('ID do pagamento não encontrado na notificação')
      }
    } else if (type === 'subscription' || type === 'preapproval') {
      const subscriptionId = body.data?.id
      if (subscriptionId) {
        await processSubscription(subscriptionId)
      } else {
        console.error('ID da assinatura não encontrado na notificação')
      }
    } else {
      console.log(`Tipo de notificação não suportado: ${type}, ignorando...`)
    }

    // Responder com sucesso
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    // Logar e responder com erro
    console.error('Erro ao processar webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
'@

# Escrever o conteúdo refatorado para um arquivo temporário
$refactoredCode | Out-File -FilePath $refactoredContent -Encoding utf8

# Substituir o arquivo original pelo refatorado
Copy-Item -Path $refactoredContent -Destination $originalFile -Force
Remove-Item -Path $refactoredContent -Force

Write-Host "Refatoração aplicada com sucesso ao arquivo $originalFile"
Write-Host "O backup do arquivo original está em $backupFile"
