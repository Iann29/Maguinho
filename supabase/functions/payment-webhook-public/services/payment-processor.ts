// services/payment-processor.ts
import { PaymentAttempt, PaymentDetails, PaymentProcessResult } from '../types.ts';
import { getPaymentDetails } from './mercadopago.ts';
import { logDebug, logError, logInfo } from '../utils/logger.ts';
import { getValidToken } from '../utils/tokens.ts';
import * as db from './database.ts';

/**
 * Calcula a data de término com base no intervalo do plano
 */
function calculateEndDate(startDate: Date, interval: string): Date {
  const endDate = new Date(startDate);
  
  if (interval === 'mensal') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (interval === 'trimestral') {
    endDate.setMonth(endDate.getMonth() + 3);
  } else if (interval === 'anual') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
  
  return endDate;
}

/**
 * Processa o pagamento quando não temos dados da tentativa de pagamento
 */
async function processPaymentWithoutAttempt(payment: PaymentDetails): Promise<PaymentProcessResult> {
  logInfo('Processando pagamento sem dados de tentativa prévia');
  
  const userId = payment.external_reference || payment.metadata?.user_id;
  if (!userId) {
    logError('ID de usuário não encontrado no pagamento');
    throw new Error('ID de usuário não encontrado no pagamento');
  }
  
  const planId = payment.metadata?.plan_id;
  const planInterval = payment.metadata?.plan_interval || 'mensal';
  
  // Se temos metadados suficientes, criar um registro completo
  if (planId && planInterval) {
    logDebug('Criando registro de pagamento com metadados disponíveis');
    
    // Buscar o plano
    const plano = await db.findPlan(planId, null, planInterval);
    
    if (!plano) {
      logError('Plano não encontrado para os dados fornecidos');
      throw new Error('Plano não encontrado');
    }
    
    // Extrair nome do plano dos metadados ou da descrição
    let planName = null;
    if (planId && planId.toLowerCase().includes('premium')) {
      planName = 'Plano Premium';
    } else if (planId && planId.toLowerCase().includes('basico')) {
      planName = 'Plano Básico';
    } else if (payment.description) {
      if (payment.description.toLowerCase().includes('premium')) {
        planName = 'Plano Premium';
      } else if (payment.description.toLowerCase().includes('básico') || 
                payment.description.toLowerCase().includes('basico')) {
        planName = 'Plano Básico';
      }
    }
    
    // Processar o pagamento com os dados extraídos
    return await processPaymentWithData(payment, {
      user_id: userId,
      plan_id: plano.id,
      plan_name: planName || plano.name,
      plan_price: payment.transaction_amount,
      plan_interval: planInterval
    });
  } else {
    // Criar um registro básico sem metadados completos
    logDebug('Criando registro básico sem metadados completos');
    
    // Buscar ou criar uma assinatura para associar ao pagamento
    let subscriptionId = null;
    const existingSubscription = await db.findActiveSubscription(userId);
    
    if (existingSubscription) {
      subscriptionId = existingSubscription.id;
      logDebug(`Usando assinatura existente: ${subscriptionId}`);
    } else {
      // Buscar ou criar um plano para associar à assinatura
      const anyPlan = await db.findPlan(null, null, 'mensal');
      
      if (anyPlan) {
        const startDate = new Date();
        const endDate = calculateEndDate(startDate, 'mensal');
        
        // Criar nova assinatura
        const newSubscription = await db.createSubscription({
          user_id: userId,
          plan_id: anyPlan.id,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          subscription_id: payment.id
        });
        
        if (newSubscription) {
          subscriptionId = newSubscription.id;
          logDebug(`Nova assinatura básica criada: ${subscriptionId}`);
        }
      } else {
        logError('Nenhum plano ativo encontrado para criar assinatura básica');
      }
    }
    
    // Criar registro de pagamento
    const newPayment = await db.createPayment({
      user_id: userId,
      amount: payment.transaction_amount,
      currency: 'BRL',
      payment_method: payment.payment_method_id,
      transaction_id: payment.id,
      status: 'approved',
      subscription_id: subscriptionId
    });
    
    // Registrar no log financeiro
    await db.createFinancialLog(
      userId,
      'payment_processed',
      'Pagamento recebido via webhook (sem metadados completos)',
      { payment_id: payment.id, amount: payment.transaction_amount }
    );
    
    return {
      success: true,
      status: 'approved',
      message: 'Pagamento processado com sucesso (registro básico)',
      payment_id: newPayment?.id
    };
  }
}

/**
 * Processa o pagamento com os dados da tentativa
 */
async function processPaymentWithData(payment: PaymentDetails, attemptData: any): Promise<PaymentProcessResult> {
  logInfo('Processando pagamento com dados completos');
  
  // Primeiro, criar ou atualizar a assinatura
  let subscriptionId = null;
  const userId = attemptData.user_id;
  
  // Verificar se o usuário já tem uma assinatura ativa
  const existingSubscription = await db.findActiveSubscription(userId);
  
  // Buscar plano pelo ID ou pelo intervalo
  let planId = attemptData.plan_id;
  if (!planId) {
    const plan = await db.findPlan(null, null, attemptData.plan_interval);
    if (plan) {
      planId = plan.id;
    } else {
      throw new Error(`Nenhum plano encontrado para o intervalo: ${attemptData.plan_interval}`);
    }
  }
  
  // Calcular datas de início e fim da assinatura
  const startDate = new Date();
  const endDate = calculateEndDate(startDate, attemptData.plan_interval || 'mensal');
  
  // Se já existe uma assinatura, atualizar
  if (existingSubscription) {
    logDebug(`Atualizando assinatura existente: ${existingSubscription.id}`);
    
    const updatedSubscription = await db.updateSubscription(existingSubscription.id, {
      status: 'active',
      end_date: endDate.toISOString(),
      plan_id: planId
    });
    
    subscriptionId = existingSubscription.id;
  } else {
    // Verificar se existe uma assinatura inativa para reativar
    const inactiveSubscription = await db.findInactiveSubscription(userId);
    
    if (inactiveSubscription) {
      logDebug(`Reativando assinatura inativa: ${inactiveSubscription.id}`);
      
      const reactivatedSubscription = await db.updateSubscription(inactiveSubscription.id, {
        status: 'active',
        plan_id: planId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });
      
      subscriptionId = inactiveSubscription.id;
    } else {
      // Criar uma nova assinatura
      logDebug('Criando nova assinatura');
      
      const newSubscription = await db.createSubscription({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        subscription_id: payment.id
      });
      
      if (newSubscription) {
        subscriptionId = newSubscription.id;
      }
    }
  }
  
  // Criar um registro de pagamento
  const newPayment = await db.createPayment({
    user_id: userId,
    amount: payment.transaction_amount,
    currency: 'BRL',
    payment_method: payment.payment_method_id,
    transaction_id: payment.id,
    status: 'approved',
    subscription_id: subscriptionId
  });
  
  // Determinar o nome do plano para o log
  let planNameToUse = attemptData.plan_name || 'Plano';
  let planIntervalToUse = attemptData.plan_interval || 'mensal';
  
  // Se temos o ID do plano, buscar o nome diretamente
  if (planId) {
    const planDetails = await db.findPlan(planId);
    if (planDetails) {
      planNameToUse = planDetails.name;
      if (planDetails.billing_interval) {
        planIntervalToUse = planDetails.billing_interval;
      }
    }
  }
  
  // Registrar o uso do cupom, se houver
  if (attemptData.coupon_id) {
    logDebug(`Cupom detectado nos metadados: ${attemptData.coupon_id} (${attemptData.coupon_code})`);
    
    try {
      // Registrar uso completo do cupom (registro na tabela coupon_usages e incremento no contador)
      const couponRegistered = await db.registerCompleteCouponUsage(attemptData.coupon_id, userId);
      
      if (couponRegistered) {
        logDebug(`Uso do cupom ${attemptData.coupon_code} registrado com sucesso`);
        
        // Adicionar informação do cupom no log financeiro
        await db.createFinancialLog(
          userId,
          'coupon_used',
          `Cupom ${attemptData.coupon_code} aplicado no pagamento`,
          {
            coupon_id: attemptData.coupon_id,
            coupon_code: attemptData.coupon_code,
            original_price: attemptData.original_price || 0,
            discount_amount: attemptData.discount_amount || 0,
            payment_id: payment.id
          }
        );
      } else {
        logError(`Erro ao registrar uso do cupom ${attemptData.coupon_code}`);
      }
    } catch (error) {
      logError('Erro ao processar registro de cupom', error);
      // Não interromper o fluxo principal em caso de erro no registro do cupom
    }
  }
  
  // Registrar um log financeiro
  await db.createFinancialLog(
    userId,
    'payment_processed',
    `Pagamento de ${planNameToUse} ${planIntervalToUse} processado com sucesso`,
    {
      payment_id: payment.id,
      amount: payment.transaction_amount,
      plan_name: planNameToUse,
      plan_interval: planIntervalToUse,
      coupon_applied: attemptData.coupon_id ? true : false
    }
  );
  
  return {
    success: true,
    status: 'approved'
  };
}

/**
 * Processa um pagamento com base no ID
 */
export async function processPayment(paymentId: string): Promise<Response> {
  logInfo(`Processando pagamento: ${paymentId}`);
  
  try {
    // Obter um token válido para o Mercado Pago
    const accessToken = await getValidToken();
    
    // Obter detalhes completos do pagamento
    const paymentDetails = await getPaymentDetails(paymentId);
    
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
      subscription_id: paymentDetails.id,
      description: paymentDetails.description
    };
    
    // Extrair informações dos metadados
    const metadata = payment.metadata || {};
    const userId = metadata.user_id || payment.external_reference;
    
    // Verificar se é um pagamento de teste
    const isTestPayment = paymentId === '123456' || (paymentDetails.live_mode === false);
    
    if (isTestPayment) {
      logInfo('Pagamento de teste detectado, retornando sucesso sem processar');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Pagamento de teste detectado. Notificação recebida com sucesso.',
        test_mode: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!userId) {
      logError('ID de usuário não encontrado no pagamento');
      throw new Error('ID de usuário não encontrado no pagamento');
    }
    
    // Verificar se já existe um pagamento recente aprovado para este usuário
    if (payment.status === 'approved') {
      // Verificar se já existe um pagamento recente
      const recentPayment = await db.findRecentPayment(userId, 24);
      
      if (recentPayment) {
        logInfo(`Pagamento recente já encontrado (${recentPayment.id}) para o usuário ${userId}`);
        
        // Já existe um pagamento recente, apenas retornar sucesso sem criar um novo
        return new Response(JSON.stringify({ 
          success: true, 
          status: payment.status,
          message: 'Pagamento já processado anteriormente',
          payment_id: recentPayment.id
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Buscar a tentativa de pagamento
    const attemptData = await db.findPaymentAttempt(userId, payment.external_reference);
    
    // Se não encontrou tentativa, processar sem dados de tentativa
    if (!attemptData) {
      logInfo('Tentativa de pagamento não encontrada, processando sem dados de tentativa');
      
      // Se o pagamento foi aprovado, cancelar tentativas pendentes
      if (payment.status === 'approved') {
        await db.cancelPendingAttempts(userId);
      }
      
      const result = await processPaymentWithoutAttempt(payment);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Atualizar o status da tentativa de pagamento atual
    await db.updatePaymentAttemptStatus(attemptData.id, payment.status);
    
    // Se o pagamento foi aprovado, cancelar outras tentativas e processar o pagamento
    if (payment.status === 'approved') {
      await db.cancelPendingAttempts(userId, attemptData.id);
      const result = await processPaymentWithData(payment, attemptData);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Para outros status, apenas retornar sucesso
    return new Response(JSON.stringify({ success: true, status: payment.status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logError('Erro ao processar pagamento', error);
    
    return new Response(JSON.stringify({ 
      error: 'Erro ao processar pagamento', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}