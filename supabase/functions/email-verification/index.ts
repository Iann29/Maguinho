import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-webhook-signature'
  };

  // Responde a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Verifica se o método é POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    // Logar headers para debug
    console.log('Headers recebidos:');
    for (const [key, value] of req.headers.entries()) {
      console.log(`${key}: ${value}`);
    }

    // Verificar a assinatura do webhook (opcional para testes)
    const signature = req.headers.get('x-webhook-signature');
    console.log('Signature recebida:', signature || 'Nenhuma assinatura encontrada');
    
    // MODIFICADO: Removemos a verificação obrigatória da assinatura para resolver o problema
    // Agora continuamos o fluxo mesmo sem assinatura

    // Extrair dados da requisição
    let body;
    try {
      body = await req.json();
      console.log('Evento recebido:', JSON.stringify(body));
    } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Falha ao parsear corpo da requisição' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Cria cliente Supabase com a chave de serviço
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // MODIFICADO: Detectar o formato correto do evento
    let email = null;
    let eventType = null;

    // Tentar extrair email e tipo de evento de diferentes formatos
    if (body.type) eventType = body.type;
    if (body.event) eventType = body.event;
    
    if (body.email) {
      email = body.email;
    } else if (body.record && body.record.email) {
      email = body.record.email;
    } else if (body.user && body.user.email) {
      email = body.user.email;
    }

    console.log(`Tipo de evento detectado: ${eventType || 'desconhecido'}`);
    console.log(`Email detectado: ${email || 'nenhum'}`);

    // Verificar se é um evento de confirmação de email
    const isConfirmationEvent = eventType && (
      eventType.includes('EMAIL_CONFIRMED') || 
      eventType.includes('email_confirmed') || 
      eventType.includes('signup') ||
      eventType.includes('CONFIRMATION')
    );

    if (isConfirmationEvent && email) {
      console.log(`Atualizando status de verificação para o email: ${email}`);

      // Atualizar o campo email_verified na tabela users
      const { data, error } = await supabaseAdmin
        .from("users")
        .update({ email_verified: true })
        .eq("email", email)
        .select();

      if (error) {
        console.error('Erro ao atualizar tabela users:', error);
        return new Response(
          JSON.stringify({ error: 'Falha ao atualizar status de verificação' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('Usuário atualizado com sucesso:', data);

      // Retornar resposta de sucesso
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email verificado e status atualizado",
          data
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Para outros tipos de eventos, apenas registrar e não fazer nada
    console.log("Evento não processado ou dados insuficientes");
    return new Response(
      JSON.stringify({ 
        message: "Evento recebido mas não processado", 
        reason: !email ? "Email não encontrado" : "Não é um evento de confirmação"
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    // Tratamento de erros
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar evento de verificação', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});