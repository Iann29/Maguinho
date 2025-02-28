// Lógica de processamento de pagamentos
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { 
  MercadoPagoPayment, 
  PaymentMetadata,
  SubscriptionData,
  PaymentData
} from './types.ts';
import * as db from './database.ts';

/**
 * Calcula a data de término da assinatura com base no intervalo
 * @param startDate Data de início
 * @param interval Intervalo (mensal, anual, etc)
 * @returns Data de término calculada
 */
export function calculateEndDate(startDate: Date, interval: string): Date {
  console.log(`Calculando data de término da assinatura com base no intervalo: ${interval}`);
  
  const endDate = new Date(startDate);
  
  switch (interval.toLowerCase()) {
    case 'anual':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    case 'semestral':
      endDate.setMonth(endDate.getMonth() + 6);
      break;
    case 'trimestral':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'mensal':
    default:
      endDate.setMonth(endDate.getMonth() + 1);
      break;
  }
  
  return endDate;
}

/**
 * Extrai o nome do plano a partir do ID ou descrição
 * @param planId ID do plano nos metadados
 * @param description Descrição do pagamento
 * @returns Nome do plano extraído ou null
 */
export function extractPlanName(planId?: string, description?: string): string | null {
  // Verificar se o plan_id contém informações sobre o nome do plano
  if (planId) {
    if (planId.toLowerCase().includes('premium')) {
      console.log('Nome do plano extraído do plan_id: Plano Premium');
      return 'Plano Premium';
    } else if (planId.toLowerCase().includes('basico')) {
      console.log('Nome do plano extraído do plan_id: Plano Básico');
      return 'Plano Básico';
    }
  }
  
  // Verificar se há informações na descrição do pagamento
  if (description) {
    if (description.toLowerCase().includes('premium')) {
      console.log('Nome do plano extraído da descrição: Plano Premium');
      return 'Plano Premium';
    } else if (description.toLowerCase().includes('básico') || description.toLowerCase().includes('basico')) {
      console.log('Nome do plano extraído da descrição: Plano Básico');
      return 'Plano Básico';
    }
  }
  
  return null;
}

/**
 * Gerencia a assinatura do usuário (cria, atualiza ou reativa)
 * @param supabase Cliente Supabase
 * @param payment Dados do pagamento
 * @param metadata Metadados do pagamento
 * @returns ID da assinatura gerenciada
 */
export async function manageSubscription(
  supabase: SupabaseClient,
  payment: MercadoPagoPayment,
  metadata: PaymentMetadata
): Promise<string | null> {
  const userId = metadata.user_id;
  const planId = metadata.plan_id;
  
  if (!userId) {
    console.error('ID do usuário não encontrado nos metadados');
    return null;
  }
  
  // Verificar se já existe uma assinatura ativa para o usuário
  const activeSubscriptions = await db.findActiveSubscription(supabase, userId);
  
  // Calcular datas da assinatura
  const startDate = new Date();
  const endDate = calculateEndDate(startDate, metadata.plan_interval || 'mensal');
  
  // Se já existe uma assinatura ativa, atualizar
  if (activeSubscriptions && activeSubscriptions.length > 0) {
    console.log(`Assinatura existente encontrada (ID: ${activeSubscriptions[0].id}), atualizando...`);
    
    const updatedSubscription = await db.updateSubscription(supabase, activeSubscriptions[0].id, {
      status: 'active',
      end_date: endDate.toISOString(),
      plan_id: planId || activeSubscriptions[0].plan_id
    });
    
    return updatedSubscription?.id || null;
  } 
  
  // Verificar se existe alguma assinatura inativa para o usuário que podemos reativar
  const inactiveSubscription = await db.findInactiveSubscription(supabase, userId);
  
  if (inactiveSubscription) {
    console.log(`Assinatura inativa encontrada (ID: ${inactiveSubscription.id}), reativando...`);
    
    const reactivatedSubscription = await db.updateSubscription(supabase, inactiveSubscription.id, {
      status: 'active',
      plan_id: planId || inactiveSubscription.plan_id,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    });
    
    return reactivatedSubscription?.id || null;
  }
  
  // Se não encontrou assinatura ativa ou inativa para reativar, criar uma nova
  console.log('Nenhuma assinatura encontrada, criando nova...');
  
  if (!planId) {
    console.error('ID do plano não encontrado nos metadados');
    return null;
  }
  
  const newSubscription = await db.createSubscription(supabase, {
    user_id: userId,
    plan_id: planId,
    status: 'active',
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    subscription_id: payment.id.toString()
  });
  
  return newSubscription?.id || null;
}

/**
 * Cria um registro de pagamento
 * @param supabase Cliente Supabase
 * @param payment Dados do pagamento
 * @param subscriptionId ID da assinatura
 * @returns Dados do pagamento criado
 */
export async function createPaymentRecord(
  supabase: SupabaseClient,
  payment: MercadoPagoPayment,
  metadata: PaymentMetadata,
  subscriptionId: string | null
): Promise<PaymentData | null> {
  return await db.createPayment(supabase, {
    user_id: metadata.user_id,
    amount: payment.transaction_amount,
    currency: 'BRL',
    payment_method: payment.payment_method_id,
    transaction_id: payment.id.toString(),
    status: 'approved',
    subscription_id: subscriptionId
  });
}

/**
 * Registra um log financeiro para o pagamento
 * @param supabase Cliente Supabase
 * @param payment Dados do pagamento
 * @param metadata Metadados do pagamento
 * @param planName Nome do plano
 * @param planInterval Intervalo do plano
 */
export async function registerFinancialLog(
  supabase: SupabaseClient,
  payment: MercadoPagoPayment,
  metadata: PaymentMetadata,
  planName: string,
  planInterval: string
): Promise<void> {
  await db.createFinancialLog(supabase, {
    user_id: metadata.user_id,
    action: 'payment_processed',
    description: `Pagamento de ${planName} ${planInterval} processado com sucesso`,
    data: {
      payment_id: payment.id,
      amount: payment.transaction_amount,
      plan_name: planName,
      plan_interval: planInterval
    }
  });
}

/**
 * Identifica o plano correto com base no valor e metadados
 * @param supabase Cliente Supabase
 * @param payment Dados do pagamento
 * @param metadata Metadados do pagamento
 * @returns Objeto com o ID, nome e intervalo do plano
 */
export async function identifyCorrectPlan(
  supabase: SupabaseClient,
  payment: MercadoPagoPayment,
  metadata: PaymentMetadata
): Promise<{ id: string; name: string; interval: string }> {
  let planId = metadata.plan_id;
  let planName = metadata.plan_name || 'Plano';
  let planInterval = metadata.plan_interval || 'mensal';
  
  // Extrair nome do plano dos metadados ou descrição
  const extractedName = extractPlanName(metadata.plan_id, payment.description);
  if (extractedName) {
    planName = extractedName;
  }
  
  // Se temos o ID do plano, buscar os detalhes
  if (planId) {
    // Verificar se o planId parece ser um nome de plano e não um UUID
    if (planId && !planId.includes('-')) {
      // Extrair o nome do plano do plan_id (ex: "plano_premium_mensal" -> "premium")
      const planNameFromId = planId.replace('plano_', '').replace('_mensal', '').replace('_anual', '');
      console.log(`Buscando plano pelo nome extraído: ${planNameFromId}`);
      
      const plan = await db.findPlanByName(supabase, planNameFromId, planInterval);
      if (plan) {
        planId = plan.id;
        planName = plan.name;
        planInterval = plan.billing_interval;
        console.log(`Plano encontrado pelo nome: ${planName} (${planInterval})`);
      }
    } else {
      // Buscar pelo ID diretamente
      const plan = await db.findPlanById(supabase, planId);
      if (plan) {
        planName = plan.name;
        planInterval = plan.billing_interval;
        console.log(`Plano encontrado pelo ID: ${planName} (${planInterval})`);
      }
    }
  } 
  // Se não temos o ID ou não encontramos o plano, tentar pelo valor
  else {
    const plan = await db.findClosestPlanByAmount(supabase, payment.transaction_amount, planInterval);
    if (plan) {
      planId = plan.id;
      planName = plan.name;
      planInterval = plan.billing_interval;
      console.log(`Plano encontrado pelo valor: ${planName} (${planInterval})`);
    } else {
      // Último recurso: buscar qualquer plano ativo com o intervalo especificado
      const fallbackPlan = await db.findPlanByInterval(supabase, planInterval);
      if (fallbackPlan) {
        planId = fallbackPlan.id;
        planName = fallbackPlan.name;
        console.log(`Plano encontrado pelo intervalo: ${planName} (${planInterval})`);
      }
    }
  }
  
  // Verificar se o plano é Premium com base no nome ou ID nos metadados
  if (metadata.plan_id && metadata.plan_id.toLowerCase().includes('premium')) {
    console.log('Detectado plano Premium nos metadados, ajustando nome...');
    planName = planName.includes('Premium') ? planName : 'Plano Premium';
  }
  
  console.log(`Nome final do plano: ${planName} (${planInterval})`);
  
  return {
    id: planId || '',
    name: planName,
    interval: planInterval
  };
}
