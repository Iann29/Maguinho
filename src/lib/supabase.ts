import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Usando a nova rota
    redirectTo: `${window.location.origin}/recuperar-senha`,
    // Desabilitando PKCE temporariamente para testar
    flowType: 'implicit'
  }
})
