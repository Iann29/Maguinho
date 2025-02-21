import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, UserX } from "lucide-react";

export function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // TODO: Implementar verificação de autenticação
        const isAuthenticated = false; // Temporário
        if (!isAuthenticated) {
          navigate('/login');
          return;
        }
        
        // TODO: Buscar dados do usuário
        setUser(null);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      // TODO: Implementar lógica de logout
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // TODO: Implementar lógica de deleção de conta
      navigate('/login');
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0D0F] flex items-center justify-center">
        <div className="text-[#00E7C1] text-lg">Carregando...</div>
      </div>
    );
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
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <UserX size={20} />
                <span>Excluir Conta</span>
              </button>
              <button
                onClick={handleLogout}
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
            Email: {user?.email}
          </p>
        </div>
      </main>
    </div>
  );
}
