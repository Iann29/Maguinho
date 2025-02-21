// supabase/functions/create-user/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const { name, email, cpf, phone, password } = await req.json();

    if (!name || !email || !password || !cpf || !phone) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios ausentes' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Recebendo dados para criar usuário:', { name, email, cpf, phone });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar duplicatas
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .or(`email.eq.${email},cpf.eq.${cpf},phone.eq.${phone}`)
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar duplicados:', checkError);
      throw new Error('Erro ao verificar duplicados');
    }
    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Já existe um usuário com este email/CPF/telefone' }),
        { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Criar usuário no Auth com confirmação de email
    console.log('Criando usuário no Auth com email:', email);

    const isLocal = Deno.env.get('ENVIRONMENT') === 'local';
    const redirectUrl = isLocal
      ? (Deno.env.get('EMAIL_REDIRECT_LOCAL') ?? 'http://localhost:5173/login')
      : (Deno.env.get('EMAIL_REDIRECT_PROD') ?? 'https://maguinho.com/login');

    console.log('Usando URL de redirecionamento:', redirectUrl);

    // Criar usuário usando signUp em vez de createUser
    const { data: userData, error: createError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          cpf,
          phone
        }
      }
    });

    if (createError) {
      console.error('Erro ao criar usuário no Auth:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Usuário criado no Auth:', userData.user?.id);

    // Inserir na tabela `users`
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userData.user?.id,
        name,
        email,
        cpf,
        phone
      });

    if (insertError) {
      console.error('Erro ao inserir na tabela users:', insertError);
      return new Response(
        JSON.stringify({ error: 'Falha ao inserir dados de usuário na tabela' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Usuário inserido na tabela users com sucesso:', userData.user?.id);
    return new Response(
      JSON.stringify({ message: 'Usuário criado com sucesso. Verifique seu email para confirmar.' }),
      { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Erro geral ao criar usuário:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao criar usuário' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});