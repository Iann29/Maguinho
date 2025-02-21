import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Cliente Supabase com a chave de serviço para operações administrativas
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function deleteUserAccount(userId: string) {
  try {
    // Deletamos os dados do usuário de todas as tabelas relacionadas
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    // Deletamos os dados do perfil (se existir)
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    // Por fim, deletamos a conta de autenticação
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    return { success: false, error };
  }
}
