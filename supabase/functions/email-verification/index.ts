import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  };

  // Responde a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Log completo da requisição para diagnóstico
    console.log('Método:', req.method);
    console.log('URL:', req.url);
    
    console.log('Headers:');
    for (const [key, value] of req.headers.entries()) {
      console.log(`${key}: ${value}`);
    }

    let body;
    // Tentar obter o corpo da requisição com tratamento de erro
    try {
      const text = await req.text();
      console.log('Corpo da requisição (texto):', text);
      
      if (text) {
        try {
          body = JSON.parse(text);
          console.log('Corpo parseado:', body);
        } catch (e) {
          console.log('Não foi possível parsear o JSON, usando texto bruto');
          body = { rawText: text };
        }
      } else {
        console.log('Corpo da requisição vazio');
        body = {};
      }
    } catch (e) {
      console.error('Erro ao ler corpo da requisição:', e);
      body = {};
    }

    // Cria cliente Supabase com a chave de serviço
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Vamos primeiro verificar a conexão com o Supabase
    const { data: testData, error: testError } = await supabaseAdmin
      .from('users')
      .select('count(*)', { count: 'exact' })
      .limit(1);

    if (testError) {
      console.error('Erro ao conectar com o Supabase:', testError);
      return new Response(
        JSON.stringify({ error: 'Falha na conexão com banco de dados' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    console.log('Conexão com Supabase Ok! Contagem:', testData);

    // Tentar extrair email de várias formas possíveis
    let email = null;
    
    // Verificar diferentes locais onde o email pode estar
    if (body && typeof body === 'object') {
      if (body.email) {
        email = body.email;
      } else if (body.record && body.record.email) {
        email = body.record.email;
      } else if (body.user && body.user.email) {
        email = body.user.email;
      } else if (body.data && body.data.email) {
        email = body.data.email;
      } else if (body.rawText && body.rawText.includes('@')) {
        // Tentativa de extrair email de texto bruto
        const match = body.rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (match) email = match[0];
      }
    }

    console.log('Email extraído:', email);

    // Se encontramos um email, vamos atualizar o status
    if (email) {
      console.log(`Atualizando status de verificação para: ${email}`);

      const { data, error } = await supabaseAdmin
        .from("users")
        .update({ email_verified: true })
        .eq("email", email);

      if (error) {
        console.error('Erro ao atualizar tabela users:', error);
        return new Response(
          JSON.stringify({ error: 'Falha ao atualizar status de verificação', details: error }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('Usuário atualizado com sucesso:', data);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email verificado com sucesso",
          email: email
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Se chegou aqui, não encontramos um email válido
    return new Response(
      JSON.stringify({ 
        status: "noop", 
        message: "Nenhum email encontrado para atualizar",
        received: body
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    // Tratamento de erros
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno', 
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});