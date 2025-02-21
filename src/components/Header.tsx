import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Verifica se o usuário está logado e se a conta ainda existe
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Verifica se o usuário ainda existe na tabela users
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();

          if (userError || !userData) {
            // Se não encontrar o usuário na tabela, faz logout
            await supabase.auth.signOut();
            setUser(null);
          } else {
            setUser(user);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Escuta mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Verifica se o usuário existe na tabela users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (userError || !userData) {
          await supabase.auth.signOut();
          setUser(null);
        } else {
          setUser(session.user);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Não mostra nada enquanto está verificando o usuário
  if (loading) {
    return null;
  }
  
  return (
    <header className="bg-[#1C1E21]/60 backdrop-blur-sm border-b border-[#2A2D31]/50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div 
            className="text-2xl font-bold bg-gradient-to-r from-[#00E7C1] to-[#00E7C1]/80 text-transparent bg-clip-text cursor-pointer"
            onClick={() => navigate('/')}
          >
            Maguinho
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00E7C1]/10 hover:bg-[#00E7C1]/20 transition-colors"
              >
                <User className="w-5 h-5 text-[#00E7C1]" />
              </button>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/login')}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="bg-[#00E7C1] text-black px-4 py-2 rounded-full hover:bg-[#00E7C1]/90 transition-colors"
                >
                  Registro
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
