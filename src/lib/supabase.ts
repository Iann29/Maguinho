import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Atualizando a URL de redirecionamento para incluir o código
    redirectTo: `${window.location.origin}/update-password?code=`,
    // Configurações adicionais para debug
    debug: true,
    // Configurando o storage para persistir a sessão
    storage: window.localStorage,
    storageKey: 'supabase.auth.token'
  }
})
