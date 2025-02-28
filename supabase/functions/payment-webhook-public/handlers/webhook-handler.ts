// handlers/webhook-handler.ts
import { corsHeaders } from '../../_shared/cors.ts';
import { logDebug, logError, logInfo } from '../utils/logger.ts';
import { processPayment } from '../services/payment-processor.ts';
import { PaymentNotification } from '../types.ts';
import { getPaymentDetails } from '../services/mercadopago.ts';
import { getValidToken } from '../utils/tokens.ts';

/**
 * Processa o webhook do Mercado Pago
 */
export async function handleWebhook(req: Request): Promise<Response> {
  // Lidar com requisições OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Log da requisição recebida
  logInfo('Requisição recebida:');
  logInfo('- Método: ' + req.method);
  logInfo('- URL: ' + req.url);
  
  try {
    // Verificar o método da requisição
    if (req.method !== 'POST') {
      logInfo('Método não permitido: ' + req.method);
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar se há corpo da requisição
    const contentType = req.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      logError('Content-Type não suportado: ' + contentType);
      return new Response(JSON.stringify({ error: 'Content-Type não suportado' }), {
        status: 415,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ler o corpo da requisição
    const body: PaymentNotification = await req.json();
    logInfo('Corpo da requisição: ' + JSON.stringify(body));

    // Validar o corpo da requisição
    if (!body.data) {
      logError('Corpo da requisição não contém dados do pagamento');
      return new Response(JSON.stringify({ error: 'Corpo da requisição não contém dados do pagamento' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logInfo('Tipo de notificação: ' + body.action);
    logInfo('ID da notificação: ' + body.id);
    logInfo('Dados do pagamento: ' + JSON.stringify(body.data));

    // Obter o tipo de ação
    const action = body.action || '';
    
    if (action !== 'payment.created' && action !== 'payment.updated') {
      logInfo('Ação não tratada: ' + action);
      return new Response(JSON.stringify({ success: true, message: 'Ação não tratada' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Para notificações de pagamento, obter o ID do pagamento
    const paymentId = body.data.id;
    logInfo('ID do pagamento: ' + paymentId);
    
    if (!paymentId) {
      logError('ID do pagamento não encontrado na notificação');
      return new Response(JSON.stringify({ error: 'ID do pagamento não encontrado na notificação' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar se é um ID de teste (123456)
    const isTestId = paymentId === '123456';
    const isTestMode = body.live_mode !== undefined && body.live_mode === false;
    
    if (isTestId || isTestMode) {
      logInfo('Notificação de teste detectada. ID: ' + paymentId + ', live_mode: ' + body.live_mode);
      
      // Se for um teste do Mercado Pago, retornar sucesso sem processamento
      if (action === 'payment.updated' || action === 'payment.created') {
        logInfo('Retornando sucesso para notificação de teste.');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Notificação de teste recebida com sucesso.',
          test_mode: true
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Buscar os detalhes completos do pagamento na API do Mercado Pago
    logInfo('Buscando detalhes do pagamento na API do Mercado Pago...');
    const token = await getValidToken();
    
    try {
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!mpResponse.ok) {
        const errorData = await mpResponse.json();
        logError('Erro ao buscar detalhes do pagamento', errorData);
        
        // Se o erro for 404 (não encontrado) e for um ID de teste, retorne sucesso
        if (mpResponse.status === 404 && (isTestId || isTestMode)) {
          logInfo('ID de pagamento de teste não encontrado na API, mas retornando sucesso.');
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Pagamento de teste detectado. Notificação recebida com sucesso.',
            test_mode: true
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ error: 'Erro ao buscar detalhes do pagamento', details: errorData }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Processar o pagamento com os detalhes completos
      return await processPayment(paymentId);
    } catch (error) {
      logError('Erro ao verificar pagamento na API do Mercado Pago', error);
      
      // Se for um ID de teste, retornar sucesso mesmo com erro
      if (isTestId || isTestMode) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Notificação de teste detectada. Processada com sucesso.',
          test_mode: true
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw error;
    }
  } catch (error) {
    logError('Erro ao processar webhook', error);
    
    return new Response(JSON.stringify({ error: 'Erro ao processar webhook', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}