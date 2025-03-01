import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, UserX, Lock } from "lucide-react";
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { 
  SubscriptionCard, 
  FinancialSummary, 
  QuickActions, 
  WelcomeMessage, 
  PasswordModal 
} from '../components/dashboard';

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
          
          {/* Card de Assinatura */}
          <SubscriptionCard subscription={subscription} plan={plan} />
          
          {/* Conteúdo principal da dashboard */}
          {subscription && plan ? (
            <>
              {/* Resumo Financeiro - Mostrado apenas para usuários com assinatura */}
              <FinancialSummary />
              
              {/* Botões de ação rápida */}
              <QuickActions />
            </>
          ) : (
            /* Mensagem de boas-vindas para novos usuários */
            <WelcomeMessage isNewUser={true} />
          )}
        </div>
      </div>

      {/* Modal de Atualização de Senha */}
      <PasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
