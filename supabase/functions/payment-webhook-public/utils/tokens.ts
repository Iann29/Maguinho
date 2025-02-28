// utils/tokens.ts
import { MP_CLIENT_ID, MP_CLIENT_SECRET, TOKEN_CACHE_DURATION } from '../config.ts';
import { logDebug, logError, logInfo } from './logger.ts';

// Cache do token de acesso
let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Obtém um token de acesso do Mercado Pago usando client_id e client_secret
 */
export async function getAccessToken(): Promise<string> {
  try {
    logDebug('Tentando obter token de acesso com Client ID e Secret');
    
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
      logError('Erro ao obter token de acesso', errorData);
      throw new Error(`Erro ao obter token de acesso: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    logInfo('Token de acesso obtido com sucesso');
    return data.access_token;
  } catch (error) {
    logError('Erro ao obter token de acesso', error);
    throw new Error(`Erro ao obter token de acesso: ${error.message}`);
  }
}

/**
 * Obtém um token válido (do cache ou gera um novo)
 */
export async function getValidToken(): Promise<string> {
  const now = Date.now();
  
  // Se o token estiver em cache e ainda for válido, retornar
  if (cachedToken && tokenExpiry > now) {
    logDebug('Usando token em cache');
    return cachedToken;
  }
  
  // Caso contrário, gerar um novo token
  logDebug('Gerando novo token com Client ID e Client Secret');
  const token = await getAccessToken();
  
  // Armazenar o token em cache (validade conforme configuração)
  cachedToken = token;
  tokenExpiry = now + TOKEN_CACHE_DURATION;
  
  return token;
}