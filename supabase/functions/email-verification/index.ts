// supabase/functions/email-verification/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type'
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
    // Verificar a assinatura do webhook
    const signature = req.headers.get('x-webhook-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Assinatura ausente' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    // Aqui você pode adicionar o código para verificar a assinatura
    // Por enquanto, vamos apenas logar para verificar se está chegando
    console.log('Signature recebida:', signature);

    // Extrair dados da requisição
    const body = await req.json();
    console.log('Evento recebido:', JSON.stringify(body));

    // Cria cliente Supabase com a chave de serviço
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar o tipo de evento recebido
    if (
      body.type === "AUTH_EMAIL_CONFIRMED" ||
      body.type === "email_confirmed" ||
      body.type === "signup"
    ) {
      // Extrair o email do usuário
      const email = body.email;
      
      if (!email) {
        console.error('Email não encontrado no evento');
        return new Response(
          JSON.stringify({ error: 'Email não encontrado no evento' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

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
    console.log("Evento não processado:", body.type);
    return new Response(
      JSON.stringify({ message: "Evento recebido mas não processado" }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    // Tratamento de erros
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar evento de verificação' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});