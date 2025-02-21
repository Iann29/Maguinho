import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase com a chave de serviço
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(request, response) {
  if (request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Método não permitido' })
  }

  try {
    const { userId } = request.body

    if (!userId) {
      return response.status(400).json({ error: 'ID do usuário é obrigatório' })
    }

    // Deletar dados do usuário
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    // Deletar a conta de autenticação
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) throw error

    return response.status(200).json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    return response.status(500).json({ error: 'Erro ao deletar usuário' })
  }
}
