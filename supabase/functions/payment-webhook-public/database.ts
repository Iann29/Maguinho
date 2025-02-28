// Funções para interagir com o banco de dados Supabase
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { 
  PaymentAttempt, 
  PaymentData, 
  SubscriptionData, 
  FinancialLogData,
  MercadoPagoPayment,
  PaymentMetadata
} from './types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

/**
 * Cria e retorna um cliente Supabase
 * @returns Cliente Supabase inicializado
 */
export function getSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Busca uma tentativa de pagamento pelo ID do pagamento
 * @param supabase Cliente Supabase
 * @param paymentId ID do pagamento
 * @returns Promise com a tentativa de pagamento encontrada ou null
 */
export async function findPaymentAttempt(
  supabase: SupabaseClient, 
  paymentId: string, 
  userId?: string
): Promise<PaymentAttempt | null> {
  console.log('Buscando tentativa de pagamento no banco de dados...');
  
  // Primeiro, tentar buscar pelo ID do pagamento
  let query = supabase
    .from('payment_attempts')
    .select('*')
    .eq('payment_id', paymentId)
    .limit(1);
    
  let { data, error } = await query;
  
  if (error) {
    console.error('Erro ao buscar tentativa de pagamento:', error);
    throw new Error(`Erro ao buscar tentativa de pagamento: ${error.message}`);
  }
  
  // Se não encontrou pelo payment_id, tentar pelo external_reference (user_id)
  if (!data || data.length === 0) {
    if (userId) {
      console.log(`Usando external_reference como critério adicional: ${userId}`);
      
      const { data: userData, error: userError } = await supabase
        .from('payment_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (userError) {
        console.error('Erro ao buscar tentativa de pagamento pelo user_id:', userError);
      } else if (userData && userData.length > 0) {
        return userData[0];
      }
    }
    
    console.log(`Tentativa de pagamento não encontrada para o usuário: ${userId || 'desconhecido'}`);
    return null;
  }
  
  return data[0];
}

/**
 * Atualiza o status de uma tentativa de pagamento
 * @param supabase Cliente Supabase
 * @param attemptId ID da tentativa de pagamento
 * @param status Novo status
 * @returns Promise com o resultado da atualização
 */
export async function updatePaymentAttemptStatus(
  supabase: SupabaseClient,
  attemptId: string,
  status: string
): Promise<void> {
  const { error } = await supabase
    .from('payment_attempts')
    .update({ 
      status, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', attemptId);
    
  if (error) {
    console.error('Erro ao atualizar status da tentativa:', error);
    throw new Error(`Erro ao atualizar status da tentativa: ${error.message}`);
  }
}

/**
 * Atualiza todas as tentativas pendentes de um usuário
 * @param supabase Cliente Supabase
 * @param userId ID do usuário
 * @param status Novo status
 * @returns Promise com o número de tentativas atualizadas
 */
export async function updateAllPendingAttempts(
  supabase: SupabaseClient,
  userId: string,
  status: string
): Promise<number> {
  console.log(`Atualizando todas as tentativas pendentes do usuário...`);
  
  const { data, error } = await supabase
    .from('payment_attempts')
    .update({ 
      status, 
      updated_at: new Date().toISOString() 
    })
    .eq('user_id', userId)
    .eq('status', 'pending');
    
  if (error) {
    console.error('Erro ao atualizar tentativas pendentes:', error);
    throw new Error(`Erro ao atualizar tentativas pendentes: ${error.message}`);
  }
  
  const count = data?.length || 0;
  console.log(`${count} tentativas pendentes atualizadas com sucesso`);
  return count;
}

/**
 * Busca uma assinatura ativa para um usuário
 * @param supabase Cliente Supabase
 * @param userId ID do usuário
 * @returns Promise com a assinatura encontrada ou null
 */
export async function findActiveSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionData[] | null> {
  console.log(`Verificando assinatura existente...`);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Erro ao verificar assinatura:', error);
    throw new Error(`Erro ao verificar assinatura: ${error.message}`);
  }
  
  return data && data.length > 0 ? data : null;
}

/**
 * Busca uma assinatura inativa para um usuário
 * @param supabase Cliente Supabase
 * @param userId ID do usuário
 * @returns Promise com a assinatura encontrada ou null
 */
export async function findInactiveSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionData | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error) {
    console.error('Erro ao verificar assinaturas inativas:', error);
    throw new Error(`Erro ao verificar assinaturas inativas: ${error.message}`);
  }
  
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Atualiza uma assinatura existente
 * @param supabase Cliente Supabase
 * @param subscriptionId ID da assinatura
 * @param data Dados para atualização
 * @returns Promise com a assinatura atualizada
 */
export async function updateSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  data: Partial<SubscriptionData>
): Promise<SubscriptionData | null> {
  console.log(`Atualizando assinatura (ID: ${subscriptionId})...`);
  
  const { data: updatedData, error } = await supabase
    .from('subscriptions')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', subscriptionId)
    .select();
    
  if (error) {
    console.error('Erro ao atualizar assinatura:', error);
    throw new Error(`Erro ao atualizar assinatura: ${error.message}`);
  }
  
  console.log(`Assinatura atualizada com sucesso (ID: ${subscriptionId})`);
  return updatedData && updatedData.length > 0 ? updatedData[0] : null;
}

/**
 * Cria uma nova assinatura
 * @param supabase Cliente Supabase
 * @param data Dados da assinatura
 * @returns Promise com a assinatura criada
 */
export async function createSubscription(
  supabase: SupabaseClient,
  data: Omit<SubscriptionData, 'id' | 'created_at' | 'updated_at'>
): Promise<SubscriptionData | null> {
  console.log('Criando nova assinatura...');
  
  const { data: newData, error } = await supabase
    .from('subscriptions')
    .insert(data)
    .select();
    
  if (error) {
    console.error('Erro ao criar assinatura:', error);
    throw new Error(`Erro ao criar assinatura: ${error.message}`);
  }
  
  if (newData && newData.length > 0) {
    console.log(`Nova assinatura criada com sucesso (ID: ${newData[0].id})`);
    return newData[0];
  } else {
    console.log('Nova assinatura criada, mas não foi possível recuperar o ID');
    return null;
  }
}

/**
 * Cria um novo registro de pagamento
 * @param supabase Cliente Supabase
 * @param data Dados do pagamento
 * @returns Promise com o pagamento criado
 */
export async function createPayment(
  supabase: SupabaseClient,
  data: Omit<PaymentData, 'id' | 'created_at' | 'updated_at'>
): Promise<PaymentData | null> {
  const { data: paymentData, error } = await supabase
    .from('payments')
    .insert(data)
    .select();
    
  if (error) {
    console.error('Erro ao criar registro de pagamento:', error);
    throw new Error(`Erro ao criar registro de pagamento: ${error.message}`);
  }
  
  if (paymentData && paymentData.length > 0) {
    console.log(`Registro de pagamento criado: ${JSON.stringify(paymentData[0])}`);
    return paymentData[0];
  }
  
  return null;
}

/**
 * Registra um log financeiro
 * @param supabase Cliente Supabase
 * @param data Dados do log financeiro
 * @returns Promise com o resultado da operação
 */
export async function createFinancialLog(
  supabase: SupabaseClient,
  data: FinancialLogData
): Promise<void> {
  console.log('Registrando log financeiro...');
  
  const { error } = await supabase
    .from('financial_logs')
    .insert(data);
    
  if (error) {
    console.error('Erro ao registrar log financeiro:', error);
    // Não lançar erro para não interromper o fluxo principal
  } else {
    console.log('Log financeiro registrado com sucesso');
  }
}

/**
 * Busca um plano pelo ID
 * @param supabase Cliente Supabase
 * @param planId ID do plano
 * @returns Promise com o plano encontrado ou null
 */
export async function findPlanById(
  supabase: SupabaseClient,
  planId: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .limit(1);
    
  if (error) {
    console.error('Erro ao buscar plano:', error);
    throw new Error(`Erro ao buscar plano: ${error.message}`);
  }
  
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Busca um plano pelo intervalo de cobrança
 * @param supabase Cliente Supabase
 * @param interval Intervalo de cobrança
 * @returns Promise com o plano encontrado ou null
 */
export async function findPlanByInterval(
  supabase: SupabaseClient,
  interval: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('billing_interval', interval)
    .eq('active', true)
    .limit(1);
    
  if (error) {
    console.error('Erro ao buscar plano pelo intervalo:', error);
    throw new Error(`Erro ao buscar plano pelo intervalo: ${error.message}`);
  }
  
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Busca um plano pelo nome
 * @param supabase Cliente Supabase
 * @param name Nome do plano
 * @param interval Intervalo de cobrança opcional
 * @returns Promise com o plano encontrado ou null
 */
export async function findPlanByName(
  supabase: SupabaseClient,
  name: string,
  interval?: string
): Promise<any | null> {
  let query = supabase
    .from('plans')
    .select('*')
    .ilike('name', `%${name}%`)
    .eq('active', true);
    
  if (interval) {
    query = query.eq('billing_interval', interval);
  }
  
  const { data, error } = await query.limit(1);
    
  if (error) {
    console.error('Erro ao buscar plano pelo nome:', error);
    throw new Error(`Erro ao buscar plano pelo nome: ${error.message}`);
  }
  
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Busca o plano mais próximo pelo valor
 * @param supabase Cliente Supabase
 * @param amount Valor do pagamento
 * @param interval Intervalo de cobrança opcional
 * @returns Promise com o plano encontrado ou null
 */
export async function findClosestPlanByAmount(
  supabase: SupabaseClient,
  amount: number,
  interval?: string
): Promise<any | null> {
  // Buscar todos os planos ativos
  let query = supabase
    .from('plans')
    .select('id, name, price, billing_interval')
    .eq('active', true);
    
  if (interval) {
    query = query.eq('billing_interval', interval);
  }
  
  const { data, error } = await query;
    
  if (error) {
    console.error('Erro ao buscar planos:', error);
    throw new Error(`Erro ao buscar planos: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    return null;
  }
  
  // Encontrar o plano com o valor mais próximo
  let closestPlan = data[0];
  let minDiff = Math.abs(closestPlan.price - amount);
  
  for (let i = 1; i < data.length; i++) {
    const diff = Math.abs(data[i].price - amount);
    if (diff < minDiff) {
      minDiff = diff;
      closestPlan = data[i];
    }
  }
  
  // Se a diferença for pequena (menos de 5%), considerar como o plano correto
  if (minDiff / amount < 0.05) {
    console.log(`Plano mais próximo encontrado: ${closestPlan.name} (${closestPlan.price} ${closestPlan.billing_interval})`);
    return closestPlan;
  } else {
    console.log(`Nenhum plano próximo encontrado. Diferença mínima: ${minDiff}`);
    return null;
  }
}
