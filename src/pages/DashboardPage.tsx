import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Verifica se o usuário está autenticado e se ainda existe na tabela users
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        // Verifica se o usuário ainda existe na tabela users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError || !userData) {
          // Se não encontrar o usuário na tabela, faz logout e redireciona
          await supabase.auth.signOut();
          navigate('/login');
          return;
        }

        setUser(userData);
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao deslogar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir conta');
      }

      await supabase.auth.signOut();
      navigate('/login', { state: { message: 'Sua conta foi excluída com sucesso.' } });
    } catch (error: any) {
      console.error('Erro ao excluir conta:', error);
      alert('Erro ao excluir conta. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Mostra um loading ou nada enquanto verifica o usuário
  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0C0D0F]">
      <nav className="bg-[#2A2D31]/60 backdrop-blur-sm border-b border-[#2A2D31]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-[#00E7C1] hover:text-[#00E7C1]/80 transition-colors font-semibold"
              >
                ← Voltar ao Início
              </button>
              <h1 className="text-[#00E7C1] font-bold">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <UserX size={20} />
                <span>Excluir Conta</span>
              </button>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-[#00E7C1] hover:bg-[#00E7C1]/10 rounded-lg transition-colors"
              >
                <LogOut size={20} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#2A2D31]/60 backdrop-blur-sm border border-[#2A2D31] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Bem-vindo!</h2>
          <p className="text-gray-400">
            Email: {user.email}
          </p>
        </div>
      </main>
    </div>
  );
}
