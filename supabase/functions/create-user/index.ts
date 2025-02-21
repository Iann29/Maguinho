// supabase/functions/create-user/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Cabeçalhos para CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type'
  };

  // Responde requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Permite apenas POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    // Ler JSON do body
    const { name, email, cpf, phone, password } = await req.json();

    // Valida se campos mínimos foram enviados
    if (!name || !email || !password || !cpf || !phone) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios ausentes' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Criar cliente Supabase com a Service Role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // (Opcional) Checar duplicados manualmente
    //   - Você pode usar as constraints UNIQUE e simplesmente capturar o erro 23505 (duplicate key)
    //   - Ou pode verificar manualmente:
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .or(`email.eq.${email},cpf.eq.${cpf},phone.eq.${phone}`)
      .maybeSingle();

    if (checkError) {
      throw new Error('Erro ao verificar duplicados');
    }
    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Já existe um usuário com este email/CPF/telefone' }),
        { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 1) Cria o usuário no Auth com email de confirmação
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // false = envia email de confirmação (depende da config do seu Auth)
      // Você pode inserir dados no user_metadata, se quiser
      user_metadata: { name, cpf, phone },
    });

    if (createError) {
      // Se for erro do Supabase, retorne
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 2) Insere na tabela `users` (ignora RLS pois está com Service Role)
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
      // Pode ser erro de UNIQUE constraint ou outro
      console.error('Erro ao inserir na tabela users:', insertError);
      return new Response(
        JSON.stringify({ error: 'Falha ao inserir dados de usuário na tabela' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Se chegou aqui, deu tudo certo
    return new Response(
      JSON.stringify({ message: 'Usuário criado com sucesso. Verifique seu email para confirmar.' }),
      { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao criar usuário' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
