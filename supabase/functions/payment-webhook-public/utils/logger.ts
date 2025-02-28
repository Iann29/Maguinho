// utils/logger.ts
import { ENABLE_DEBUG_LOGS } from '../config.ts';

export function logInfo(message: string, data?: any): void {
  console.log(`[INFO] ${message}`);
  if (data !== undefined) {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }
}

export function logDebug(message: string, data?: any): void {
  if (!ENABLE_DEBUG_LOGS) return;
  
  console.log(`[DEBUG] ${message}`);
  if (data !== undefined) {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }
}

export function logError(message: string, error?: any): void {
  console.error(`[ERROR] ${message}`);
  if (error) {
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else if (typeof error === 'object') {
      console.error(JSON.stringify(error, null, 2));
    } else {
      console.error(error);
    }
  }
}

export function logInitInfo(): void {
  logInfo('Iniciando webhook-public...');
  logInfo('Ambiente: ' + Deno.env.get('DENO_ENV'));
  logInfo('SUPABASE_URL: ' + Deno.env.get('SUPABASE_URL'));
  logInfo('SUPABASE_ANON_KEY: ' + (Deno.env.get('SUPABASE_ANON_KEY') ? '[CONFIGURADO]' : '[NÃO CONFIGURADO]'));
  logInfo('Client ID disponível: ' + !!Deno.env.get('MP_PROD_CLIENT_ID'));
  logInfo('Client Secret disponível: ' + !!Deno.env.get('MP_PROD_CLIENT_SECRET'));
  logInfo('Webhook Secret disponível: ' + !!Deno.env.get('MP_WEBHOOK_SECRET'));
}