// services/database.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.ts';
import { logDebug, logError } from '../utils/logger.ts';
import { PaymentAttempt, PaymentDetails } from '../types.ts';

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Busca tentativa de pagamento pelo user_id e preference_id
 */
export async function findPaymentAttempt(userId: string, preferenceId?: string): Promise<PaymentAttempt | null> {
  logDebug(`Buscando tentativa de pagamento para usuário ${userId}`);
  
  try {
    let query = supabase
      .from('payment_attempts')
      .select('*')
      .eq('user_id', userId);
      
    // Se tivermos uma referência externa, usar como critério adicional
    if (preferenceId) {
      logDebug(`Usando preference_id como critério adicional: ${preferenceId}`);
      query = query.eq('preference_id', preferenceId);
    }
    
    // Ordenar por data de criação (mais recente primeiro) e pegar a primeira
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logError('Erro ao buscar tentativa de pagamento', error);
      throw new Error(`Erro ao buscar tentativa de pagamento: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logDebug('Nenhuma tentativa de pagamento encontrada');
      return null;
    }

    logDebug('Tentativa de pagamento encontrada', data[0]);
    return data[0];
  } catch (error) {
    logError('Erro ao buscar tentativa de pagamento', error);
    throw error;
  }
}

/**
 * Atualiza o status de uma tentativa de pagamento
 */
export async function updatePaymentAttemptStatus(attemptId: string, status: string): Promise<void> {
  logDebug(`Atualizando status da tentativa ${attemptId} para ${status}`);
  
  try {
    const { error } = await supabase
      .from('payment_attempts')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', attemptId);

    if (error) {
      logError('Erro ao atualizar tentativa de pagamento', error);
      throw new Error(`Erro ao atualizar tentativa de pagamento: ${error.message}`);
    }

    logDebug('Tentativa de pagamento atualizada com sucesso');
  } catch (error) {
    logError('Erro ao atualizar tentativa de pagamento', error);
    throw error;
  }
}

/**
 * Cancela todas as tentativas de pagamento pendentes de um usuário, exceto a atual
 */
export async function cancelPendingAttempts(userId: string, exceptAttemptId?: string): Promise<number> {
  logDebug(`Cancelando tentativas pendentes do usuário ${userId}`);
  
  try {
    let query = supabase
      .from('payment_attempts')
      .update({ 
        status: 'cancelled', 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('status', 'pending');
      
    if (exceptAttemptId) {
      query = query.neq('id', exceptAttemptId);
    }
    
    const { data, error } = await query.select();

    if (error) {
      logError('Erro ao cancelar tentativas pendentes', error);
      throw new Error(`Erro ao cancelar tentativas pendentes: ${error.message}`);
    }

    const count = data?.length || 0;
    logDebug(`${count} tentativas pendentes canceladas`);
    return count;
  } catch (error) {
    logError('Erro ao cancelar tentativas pendentes', error);
    throw error;
  }
}

/**
 * Busca plano pelo ID ou nome/intervalo
 */
export async function findPlan(planId?: string, planName?: string, planInterval?: string): Promise<any> {
  logDebug('Buscando plano', { planId, planName, planInterval });
  
  // Estratégia em várias etapas para encontrar o plano
  try {
    // ETAPA 1: Busca exata por ID (se parece com UUID)
    if (planId && planId.includes('-')) {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .eq('id', planId)
        .limit(1);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        logDebug('Plano encontrado pelo ID exato', data[0]);
        return data[0];
      }
    }
    
    // ETAPA 2: Busca pelo nome extraído do ID e intervalo
    if (planId && !planId.includes('-')) {
      // Extrair nome do plano do ID (ex: "plano_premium_mensal" -> "premium")
      let planNameFromId = '';
      
      // Diferentes padrões de ID possíveis
      if (planId.includes('_')) {
        // Padrão "plano_premium_mensal"
        const parts = planId.split('_');
        // Pegar a parte do meio (assumindo formato plano_nome_intervalo)
        if (parts.length >= 2) {
          planNameFromId = parts[1];
        }
      } else if (planId.startsWith('plano')) {
        // Padrão "planopremium" ou similar
        planNameFromId = planId.replace('plano', '');
      } else {
        // Usar o ID completo como possível nome
        planNameFromId = planId;
      }
      
      // Limpar o nome (remover acentos, espaços, minúsculas)
      planNameFromId = planNameFromId
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove acentos
      
      logDebug(`Nome extraído do ID: "${planNameFromId}"`);
      
      // Buscar com intervalo se fornecido
      let query = supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .ilike('name', `%${planNameFromId}%`);
        
      if (planInterval) {
        query = query.eq('billing_interval', planInterval);
      }
      
      const { data, error } = await query.limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        logDebug('Plano encontrado pelo nome extraído do ID', data[0]);
        return data[0];
      }
      
      // Se não encontrou com intervalo, tentar sem intervalo
      if (planInterval) {
        logDebug('Tentando encontrar plano sem restrição de intervalo');
        const { data: dataWithoutInterval, error: errorWithoutInterval } = await supabase
          .from('plans')
          .select('*')
          .eq('active', true)
          .ilike('name', `%${planNameFromId}%`)
          .limit(1);
          
        if (!errorWithoutInterval && dataWithoutInterval && dataWithoutInterval.length > 0) {
          logDebug('Plano encontrado pelo nome sem restrição de intervalo', dataWithoutInterval[0]);
          return dataWithoutInterval[0];
        }
      }
      
      // Tentar buscar palavras-chave específicas
      if (planNameFromId.includes('basic')) {
        logDebug('Buscando plano básico');
        const { data: basicPlanData, error: basicPlanError } = await supabase
          .from('plans')
          .select('*')
          .eq('active', true)
          .or(`name.ilike.%basic%,name.ilike.%básic%`)
          .limit(1);
          
        if (!basicPlanError && basicPlanData && basicPlanData.length > 0) {
          logDebug('Encontrado plano básico', basicPlanData[0]);
          return basicPlanData[0];
        }
      }
      
      if (planNameFromId.includes('premium')) {
        logDebug('Buscando plano premium');
        const { data: premiumPlanData, error: premiumPlanError } = await supabase
          .from('plans')
          .select('*')
          .eq('active', true)
          .ilike('name', '%premium%')
          .limit(1);
          
        if (!premiumPlanError && premiumPlanData && premiumPlanData.length > 0) {
          logDebug('Encontrado plano premium', premiumPlanData[0]);
          return premiumPlanData[0];
        }
      }
    }
    
    // ETAPA 3: Buscar pelo nome fornecido
    if (planName) {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .ilike('name', `%${planName}%`);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        logDebug('Plano encontrado pelo nome fornecido', data[0]);
        return data[0];
      }
    }
    
    // ETAPA 4: Buscar pelo intervalo
    if (planInterval) {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .eq('billing_interval', planInterval)
        .limit(1);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        logDebug('Plano encontrado apenas pelo intervalo', data[0]);
        return data[0];
      }
    }
    
    // ETAPA 5: FALLBACK - Buscar qualquer plano ativo
    logDebug('Fallback: buscando qualquer plano ativo');
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('active', true)
      .limit(1);
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      logDebug('Encontrado plano ativo (fallback)', data[0]);
      return data[0];
    }
    
    // Se chegou aqui, não encontrou nenhum plano
    logDebug('Nenhum plano encontrado após todas as tentativas');
    return null;
  } catch (error) {
    logError('Erro ao buscar plano', error);
    throw error;
  }
}

/**
 * Busca assinatura ativa do usuário
 */
export async function findActiveSubscription(userId: string): Promise<any> {
  logDebug(`Buscando assinatura ativa para usuário ${userId}`);
  
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logError('Erro ao buscar assinatura ativa', error);
      throw new Error(`Erro ao buscar assinatura ativa: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logDebug('Nenhuma assinatura ativa encontrada');
      return null;
    }

    logDebug('Assinatura ativa encontrada', data[0]);
    return data[0];
  } catch (error) {
    logError('Erro ao buscar assinatura ativa', error);
    throw error;
  }
}

/**
 * Busca assinatura inativa do usuário que pode ser reativada
 */
export async function findInactiveSubscription(userId: string): Promise<any> {
  logDebug(`Buscando assinatura inativa para usuário ${userId}`);
  
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logError('Erro ao buscar assinatura inativa', error);
      throw new Error(`Erro ao buscar assinatura inativa: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logDebug('Nenhuma assinatura inativa encontrada');
      return null;
    }

    logDebug('Assinatura inativa encontrada', data[0]);
    return data[0];
  } catch (error) {
    logError('Erro ao buscar assinatura inativa', error);
    throw error;
  }
}

/**
 * Atualiza uma assinatura existente
 */
export async function updateSubscription(subscriptionId: string, data: any): Promise<any> {
  logDebug(`Atualizando assinatura ${subscriptionId}`, data);
  
  try {
    const { data: updatedData, error } = await supabase
      .from('subscriptions')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select();

    if (error) {
      logError('Erro ao atualizar assinatura', error);
      throw new Error(`Erro ao atualizar assinatura: ${error.message}`);
    }

    logDebug('Assinatura atualizada com sucesso', updatedData?.[0]);
    return updatedData?.[0];
  } catch (error) {
    logError('Erro ao atualizar assinatura', error);
    throw error;
  }
}

/**
 * Cria uma nova assinatura
 */
export async function createSubscription(data: any): Promise<any> {
  logDebug('Criando nova assinatura', data);
  
  try {
    const { data: newData, error } = await supabase
      .from('subscriptions')
      .insert(data)
      .select();

    if (error) {
      logError('Erro ao criar assinatura', error);
      throw new Error(`Erro ao criar assinatura: ${error.message}`);
    }

    logDebug('Assinatura criada com sucesso', newData?.[0]);
    return newData?.[0];
  } catch (error) {
    logError('Erro ao criar assinatura', error);
    throw error;
  }
}

/**
 * Cria um registro de pagamento
 */
export async function createPayment(data: any): Promise<any> {
  logDebug('Criando registro de pagamento', data);
  
  try {
    const { data: newData, error } = await supabase
      .from('payments')
      .insert(data)
      .select();

    if (error) {
      logError('Erro ao criar registro de pagamento', error);
      throw new Error(`Erro ao criar registro de pagamento: ${error.message}`);
    }

    logDebug('Registro de pagamento criado com sucesso', newData?.[0]);
    return newData?.[0];
  } catch (error) {
    logError('Erro ao criar registro de pagamento', error);
    throw error;
  }
}

/**
 * Registra um log financeiro
 */
export async function createFinancialLog(userId: string, action: string, description: string, data: any): Promise<void> {
  logDebug(`Registrando log financeiro: ${action}`, { userId, description });
  
  try {
    const { error } = await supabase
      .from('financial_logs')
      .insert({
        user_id: userId,
        action,
        description,
        data
      });

    if (error) {
      logError('Erro ao registrar log financeiro', error);
      // Não lançar erro para não interromper o fluxo principal
    } else {
      logDebug('Log financeiro registrado com sucesso');
    }
  } catch (error) {
    logError('Erro ao registrar log financeiro', error);
    // Não lançar erro para não interromper o fluxo principal
  }
}

/**
 * Verifica se existe pagamento recente aprovado para o usuário
 */
export async function findRecentPayment(userId: string, hours: number = 24): Promise<any> {
  logDebug(`Buscando pagamento recente para usuário ${userId} nas últimas ${hours} horas`);
  
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);
  
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('created_at', cutoffTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logError('Erro ao buscar pagamento recente', error);
      throw error;
    }

    if (!data || data.length === 0) {
      logDebug('Nenhum pagamento recente encontrado');
      return null;
    }

    logDebug('Pagamento recente encontrado', data[0]);
    return data[0];
  } catch (error) {
    logError('Erro ao buscar pagamento recente', error);
    throw error;
  }
}