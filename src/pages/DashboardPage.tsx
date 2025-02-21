import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, UserX, Lock } from "lucide-react";
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface UserData extends User {
  name?: string;
  cpf?: string;
  phone?: string;
}

export function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.error('Tentativa de acesso não autorizado à dashboard. Redirecionando para login...');
          navigate('/login');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('Usuário não encontrado');
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Erro ao buscar dados do usuário:', userError);
        }

        setUser({
          ...user,
          ...userData
        });
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUpdateLoading(true);

    try {
      if (password !== confirmPassword) {
        setError('As senhas não coincidem');
        return;
      }

      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError.message);
        setError('Não foi possível atualizar sua senha. Por favor, tente novamente.');
        return;
      }

      console.log('Senha atualizada com sucesso!');
      setShowPasswordModal(false);
      setPassword('');
      setConfirmPassword('');
      alert('Senha atualizada com sucesso!');
    } catch (err) {
      console.error('Erro inesperado ao atualizar senha:', err);
      setError('Ocorreu um erro inesperado. Por favor, tente novamente.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erro ao fazer logout:', error.message);
        return;
      }

      console.log('Logout bem-sucedido! Até logo!');
      navigate('/login');
    } catch (error) {
      console.error('Erro inesperado ao fazer logout:', error);
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
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0D0F] text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2A2D31] rounded-lg hover:bg-[#2A2D31]/80 transition-colors"
            >
              <Lock size={20} />
              <span>Atualizar Senha</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <UserX size={20} />
              <span>Excluir Conta</span>
            </button>
          </div>
        </div>

        {/* Conteúdo da Dashboard */}
        <div className="bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border border-[#2A2D31]/50 p-6">
          <h2 className="text-xl font-semibold mb-4">Bem-vindo, {user?.name}</h2>
          {/* Adicione aqui o conteúdo principal da dashboard */}
        </div>

        {/* Modal de Atualização de Senha */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-[#1C1E21] border border-[#2A2D31] rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Atualizar Senha</h3>
              
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Nova Senha
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                    placeholder="Digite sua nova senha"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                    placeholder="Confirme sua nova senha"
                  />
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="showPassword"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded border-gray-300 text-[#00E7C1] focus:ring-[#00E7C1]"
                  />
                  <label htmlFor="showPassword" className="text-sm text-gray-300">
                    Mostrar senha
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setError(null);
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="bg-[#00E7C1] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#00E7C1]/90 transition-colors disabled:opacity-50"
                  >
                    {updateLoading ? 'Atualizando...' : 'Atualizar Senha'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
