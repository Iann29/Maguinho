// services/mercadopago.ts
import { PaymentDetails, SubscriptionDetails } from '../types.ts';
import { getValidToken } from '../utils/tokens.ts';
import { logDebug, logError } from '../utils/logger.ts';

/**
 * Obtém detalhes completos do pagamento do Mercado Pago
 */
export async function getPaymentDetails(paymentId: string): Promise<PaymentDetails> {
  logDebug(`Obtendo detalhes do pagamento ${paymentId} do Mercado Pago...`);
  
  try {
    const accessToken = await getValidToken();
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      logError('Erro ao obter detalhes do pagamento', errorData);
      throw new Error(`Erro ao obter detalhes do pagamento: ${errorData.message || response.statusText}`);
    }
    
    const paymentData = await response.json();
    logDebug('Detalhes do pagamento obtidos com sucesso');
    return paymentData;
  } catch (error) {
    logError('Erro ao obter detalhes do pagamento', error);
    throw error;
  }
}

/**
 * Obtém detalhes da assinatura (preapproval) do Mercado Pago
 */
export async function getSubscriptionDetails(subscriptionId: string): Promise<SubscriptionDetails> {
  logDebug(`Obtendo detalhes da assinatura ${subscriptionId} do Mercado Pago...`);
  
  try {
    const accessToken = await getValidToken();
    
    const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      logError('Erro ao obter detalhes da assinatura', errorData);
      throw new Error(`Erro ao obter detalhes da assinatura: ${errorData.message || response.statusText}`);
    }
    
    const subscriptionData = await response.json();
    logDebug('Detalhes da assinatura obtidos com sucesso');
    return subscriptionData;
  } catch (error) {
    logError('Erro ao obter detalhes da assinatura', error);
    throw error;
  }
}