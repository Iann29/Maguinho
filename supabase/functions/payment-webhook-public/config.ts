// config.ts
export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
export const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Credenciais do Mercado Pago
export const MP_CLIENT_ID = Deno.env.get('MP_PROD_CLIENT_ID') || '';
export const MP_CLIENT_SECRET = Deno.env.get('MP_PROD_CLIENT_SECRET') || '';
export const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') || '';

// Tempos de cache (em milissegundos)
export const TOKEN_CACHE_DURATION = 5 * 60 * 60 * 1000; // 5 horas

// Logging flags
export const ENABLE_DEBUG_LOGS = true;