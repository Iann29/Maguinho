import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, UserX, Lock, CreditCard } from "lucide-react";
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface UserData extends User {
  name?: string;
  cpf?: string;
  phone?: string;
}

interface Subscription {
  id: string;
  plan_name: string;
  plan_price: number;
  plan_interval: string;
  status: string;
  start_date: string;
  end_date: string;
}

export function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
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
        
        // Buscar informações da assinatura
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();
          
        if (subscriptionError) {
          console.log('Usuário não possui assinatura ativa');
        } else {
          setSubscription(subscriptionData);
        }
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
    // Confirmação do usuário
    const confirmar = window.confirm(
      'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.'
    );

    if (!confirmar) {
      return;
    }

    try {
      // Obter sessão do usuário
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Usuário não autenticado');
        navigate('/login');
        return;
      }

      // Chamar Edge Function para deletar usuário
      const res = await fetch('https://zssitwbdprfnqglttwhs.functions.supabase.co/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const { error } = await res.json();
        console.error('Erro ao excluir conta via Edge Function:', error);
        alert('Erro ao excluir conta. Por favor, tente novamente.');
        return;
      }

      // Se chegou aqui, a conta foi excluída com sucesso
      console.log('Conta excluída com sucesso. Até logo!');
      await supabase.auth.signOut();
      navigate('/login', {
        state: {
          message: 'Sua conta foi excluída com sucesso.'
        }
      });
    } catch (error) {
      console.error('Erro inesperado ao deletar conta:', error);
      alert('Ocorreu um erro inesperado. Por favor, tente novamente.');
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
          
          {subscription ? (
            // Mostrar informações da assinatura ativa
            <div className="bg-gradient-to-r from-[#00E7C1]/20 to-transparent rounded-lg p-6 mb-6 border border-[#00E7C1]/30">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard size={20} className="text-[#00E7C1]" />
                    <h3 className="text-lg font-semibold">
                      Assinatura {subscription.plan_name} Ativa
                    </h3>
                  </div>
                  <p className="text-gray-400 mb-2">
                    R$ {subscription.plan_price.toFixed(2)}/{subscription.plan_interval}
                  </p>
                  <p className="text-sm text-gray-400">
                    Válida até: {new Date(subscription.end_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/subscription')}
                  className="bg-[#2A2D31] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#2A2D31]/80 transition-colors whitespace-nowrap"
                >
                  Gerenciar Assinatura
                </button>
              </div>
            </div>
          ) : (
            // Banner para usuários sem assinatura
            <div className="bg-gradient-to-r from-[#2A2D31] to-[#1C1E21] rounded-lg p-6 mb-6 border border-[#2A2D31]/80">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Escolha seu plano Maguinho
                  </h3>
                  <p className="text-gray-400 mb-4 md:mb-0">
                    Planos a partir de R$ 19,99/mês. Tenha acesso a recursos exclusivos!
                  </p>
                </div>
                <button
                  onClick={() => navigate('/subscription')}
                  className="bg-[#00E7C1] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#00E7C1]/90 transition-colors whitespace-nowrap"
                >
                  Ver Planos
                </button>
              </div>
            </div>
          )}
          
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
