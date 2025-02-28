import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, UserX, Lock, CreditCard, CheckCircle2, Calendar, BarChart3, BookOpen, PieChart, ArrowUpRight, Wallet, TrendingUp, Plus } from "lucide-react";
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface UserData extends User {
  name?: string;
  cpf?: string;
  phone?: string;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  billing_interval: string;
  description: string;
}

export function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
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
          .limit(1);
          
        if (subscriptionError || !subscriptionData || subscriptionData.length === 0) {
          console.log('Usuário não possui assinatura ativa');
        } else {
          setSubscription(subscriptionData[0]);
          
          // Buscar informações do plano
          if (subscriptionData[0].plan_id) {
            const { data: planData, error: planError } = await supabase
              .from('plans')
              .select('*')
              .eq('id', subscriptionData[0].plan_id)
              .single();
              
            if (planError) {
              console.error('Erro ao buscar dados do plano:', planError);
            } else {
              setPlan(planData);
            }
          }
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
          
          {subscription && plan ? (
            // Mostrar informações da assinatura ativa
            <div className="bg-gradient-to-r from-[#00E7C1]/20 to-transparent rounded-lg p-6 mb-6 border border-[#00E7C1]/30">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard size={24} className="text-[#00E7C1]" />
                    <h3 className="text-xl font-semibold">
                      Assinatura {plan.name} Ativa
                    </h3>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-lg font-medium text-white">
                      R$ {plan.price.toFixed(2)}/{plan.billing_interval}
                    </p>
                    
                    <div className="flex flex-col gap-1 text-sm text-gray-400">
                      <p>
                        <span className="text-gray-300">Status:</span> {' '}
                        <span className="text-[#00E7C1] font-medium">Ativo</span>
                      </p>
                      <p>
                        <span className="text-gray-300">Início:</span> {' '}
                        {new Date(subscription.start_date).toLocaleDateString('pt-BR')}
                      </p>
                      <p>
                        <span className="text-gray-300">Próxima renovação:</span> {' '}
                        {new Date(subscription.end_date).toLocaleDateString('pt-BR')}
                      </p>
                      {plan.description && (
                        <p className="mt-2 text-gray-300">{plan.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <button
                    onClick={() => navigate('/subscription')}
                    className="bg-[#2A2D31] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#2A2D31]/80 transition-colors whitespace-nowrap w-full md:w-auto"
                  >
                    Gerenciar Assinatura
                  </button>
                  <button
                    onClick={() => window.open('https://www.mercadopago.com.br/subscriptions', '_blank')}
                    className="bg-transparent text-[#00E7C1] border border-[#00E7C1]/30 px-6 py-2 rounded-lg font-medium hover:bg-[#00E7C1]/10 transition-colors whitespace-nowrap w-full md:w-auto"
                  >
                    Ver Faturas
                  </button>
                </div>
              </div>

              {/* Recursos disponíveis */}
              <div className="mt-6 pt-6 border-t border-[#2A2D31]">
                <h4 className="text-lg font-medium mb-4">Recursos disponíveis com sua assinatura</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-[#00E7C1] mt-0.5" />
                    <div>
                      <h5 className="font-medium">Acesso ilimitado</h5>
                      <p className="text-sm text-gray-400">Acesso completo a todos os recursos do Maguinho</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Calendar size={20} className="text-[#00E7C1] mt-0.5" />
                    <div>
                      <h5 className="font-medium">Planejamento financeiro</h5>
                      <p className="text-sm text-gray-400">Ferramentas para planejar seu orçamento mensal</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <BarChart3 size={20} className="text-[#00E7C1] mt-0.5" />
                    <div>
                      <h5 className="font-medium">Relatórios avançados</h5>
                      <p className="text-sm text-gray-400">Visualize relatórios detalhados sobre suas finanças</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <BookOpen size={20} className="text-[#00E7C1] mt-0.5" />
                    <div>
                      <h5 className="font-medium">Conteúdo educacional</h5>
                      <p className="text-sm text-gray-400">Dicas e tutoriais sobre educação financeira</p>
                    </div>
                  </div>
                </div>
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
          
          {/* Conteúdo principal da dashboard */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Resumo Financeiro</h3>
              <div className="text-sm text-gray-400">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-[#1C1E21] rounded-lg p-5 border border-[#2A2D31]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Saldo Total</p>
                    <h4 className="text-2xl font-semibold mt-1">R$ 4.250,00</h4>
                  </div>
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <Wallet size={20} className="text-blue-500" />
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 flex items-center mr-2">
                    <TrendingUp size={14} className="mr-1" /> +5.2%
                  </span>
                  <span className="text-gray-400">desde o mês passado</span>
                </div>
              </div>

              <div className="bg-[#1C1E21] rounded-lg p-5 border border-[#2A2D31]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Receitas</p>
                    <h4 className="text-2xl font-semibold mt-1">R$ 6.520,00</h4>
                  </div>
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <ArrowUpRight size={20} className="text-green-500" />
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 flex items-center mr-2">
                    <TrendingUp size={14} className="mr-1" /> +12.3%
                  </span>
                  <span className="text-gray-400">desde o mês passado</span>
                </div>
              </div>

              <div className="bg-[#1C1E21] rounded-lg p-5 border border-[#2A2D31]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Despesas</p>
                    <h4 className="text-2xl font-semibold mt-1">R$ 2.270,00</h4>
                  </div>
                  <div className="bg-red-500/20 p-2 rounded-lg">
                    <PieChart size={20} className="text-red-500" />
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-red-500 flex items-center mr-2">
                    <TrendingUp size={14} className="mr-1" /> +3.7%
                  </span>
                  <span className="text-gray-400">desde o mês passado</span>
                </div>
              </div>
            </div>

            {/* Botões de ação rápida */}
            <div className="flex flex-wrap gap-3 mb-8">
              <button className="bg-[#00E7C1] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#00E7C1]/90 transition-colors flex items-center gap-2">
                <Plus size={18} />
                Nova Transação
              </button>
              <button className="bg-[#2A2D31] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A2D31]/80 transition-colors">
                Ver Relatórios
              </button>
              <button className="bg-[#2A2D31] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A2D31]/80 transition-colors">
                Configurar Orçamento
              </button>
            </div>

            {/* Mensagem de boas-vindas para novos usuários */}
            <div className="bg-gradient-to-r from-[#2A2D31] to-[#1C1E21] rounded-lg p-6 border border-[#2A2D31]/80">
              <h3 className="text-lg font-semibold mb-2">
                Bem-vindo ao Maguinho!
              </h3>
              <p className="text-gray-400 mb-4">
                Comece a organizar suas finanças agora mesmo. Adicione suas transações e acompanhe seus gastos de forma simples e eficiente.
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="bg-[#00E7C1] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#00E7C1]/90 transition-colors">
                  Começar Agora
                </button>
                <button className="bg-transparent text-[#00E7C1] border border-[#00E7C1]/30 px-4 py-2 rounded-lg font-medium hover:bg-[#00E7C1]/10 transition-colors">
                  Ver Tutorial
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Atualização de Senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
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
  );
}
