// index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleWebhook } from './handlers/webhook-handler.ts';
import { logInitInfo } from './utils/logger.ts';

// Log de inicialização
logInitInfo();

// Iniciar o servidor
serve(handleWebhook);