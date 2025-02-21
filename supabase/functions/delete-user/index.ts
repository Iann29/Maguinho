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
    // Pega o token de autorização
    const authHeader = req.headers.get('Authorization');
    console.log('Token recebido:', authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Cria cliente Supabase com a chave de serviço
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // Verifica o usuário com o token usando o cliente admin
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    console.log('Erro ao verificar usuário:', getUserError?.message);
    console.log('Usuário:', user);
    
    if (getUserError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Deleta o registro na tabela "users"
    const { error: deleteTableError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id);

    if (deleteTableError) {
      console.error('Erro ao deletar registro na tabela users:', deleteTableError);
      throw new Error('Erro ao deletar registro na tabela users');
    }

    // Deleta o usuário do auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      console.error('Erro ao deletar usuário no Auth:', deleteAuthError);
      throw new Error('Erro ao deletar usuário no Auth');
    }

    return new Response(
      JSON.stringify({ message: 'Usuário deletado com sucesso' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao deletar usuário' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});