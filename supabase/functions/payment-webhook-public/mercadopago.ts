// Funções para interagir com a API do Mercado Pago
import { MercadoPagoPayment, MercadoPagoSubscription } from './types.ts';

// Obter as credenciais do Mercado Pago das variáveis de ambiente
const MP_CLIENT_ID = Deno.env.get('MP_PROD_CLIENT_ID') || '';
const MP_CLIENT_SECRET = Deno.env.get('MP_PROD_CLIENT_SECRET') || '';

// Cache para o token de acesso
let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Obtém um token de acesso usando client_id e client_secret
 * @returns Promise com o token de acesso
 */
export async function getAccessToken(): Promise<string> {
  try {
    console.log('Tentando obter token de acesso com Client ID e Secret');
    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': MP_CLIENT_ID,
        'client_secret': MP_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao obter token de acesso:', errorData);
      throw new Error(`Erro ao obter token de acesso: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Token de acesso obtido com sucesso');
    return data.access_token;
  } catch (error) {
    console.error('Erro ao obter token de acesso:', error);
    throw new Error(`Erro ao obter token de acesso: ${error.message}`);
  }
}

/**
 * Obtém um token válido (do cache ou gera um novo)
 * @returns Promise com o token de acesso válido
 */
export async function getValidToken(): Promise<string> {
  const now = Date.now();
  
  // Se temos um token em cache e ele ainda é válido (menos de 5 horas)
  if (cachedToken && now < tokenExpiry) {
    console.log('Usando token em cache');
    return cachedToken;
  }
  
  // Gerar um novo token
  console.log('Gerando novo token com Client ID e Client Secret');
  const token = await getAccessToken();
  
  // Armazenar no cache por 5 horas (o token dura 6 horas, mas damos uma margem)
  cachedToken = token;
  tokenExpiry = now + (5 * 60 * 60 * 1000);
  
  return token;
}

/**
 * Obtém detalhes completos do pagamento do Mercado Pago
 * @param paymentId ID do pagamento
 * @param accessToken Token de acesso
 * @returns Promise com os detalhes do pagamento
 */
export async function getPaymentDetails(paymentId: string, accessToken: string): Promise<MercadoPagoPayment> {
  try {
    console.log(`Obtendo detalhes do pagamento ${paymentId} do Mercado Pago...`);
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao obter detalhes do pagamento:', errorData);
      throw new Error(`Erro ao obter detalhes do pagamento: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Detalhes do pagamento obtidos com sucesso');
    return data;
  } catch (error) {
    console.error('Erro ao obter detalhes do pagamento:', error);
    throw new Error(`Erro ao obter detalhes do pagamento: ${error.message}`);
  }
}

/**
 * Obtém detalhes da assinatura (preapproval) do Mercado Pago
 * @param subscriptionId ID da assinatura
 * @param accessToken Token de acesso
 * @returns Promise com os detalhes da assinatura
 */
export async function getSubscriptionDetails(subscriptionId: string, accessToken: string): Promise<MercadoPagoSubscription> {
  try {
    console.log(`Obtendo detalhes da assinatura ${subscriptionId} do Mercado Pago...`);
    const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao obter detalhes da assinatura:', errorData);
      throw new Error(`Erro ao obter detalhes da assinatura: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Detalhes da assinatura obtidos com sucesso');
    return data;
  } catch (error) {
    console.error('Erro ao obter detalhes da assinatura:', error);
    throw new Error(`Erro ao obter detalhes da assinatura: ${error.message}`);
  }
}
