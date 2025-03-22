import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Check, AlertCircle, Calendar, CreditCard, ShieldCheck } from "lucide-react";

// Interface para os planos
interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string;
  features: string[];
  popular?: boolean;
}

// Interface para a assinatura do usuário
interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  billing_frequency: string;
  subscription_id: string;
  override_price: number;
}

// Interface para o plano atual na tabela plans
interface DBPlan {
  id: string;
  name: string;
  price: number;
  billing_interval: string;
  description: string;
}

export function GerenciarAssinaturaPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [dbPlan, setDBPlan] = useState<DBPlan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingInterval, setBillingInterval] = useState<'mensal' | 'trimestral' | 'anual'>('mensal');
  const [changeOption, setChangeOption] = useState<'immediate' | 'next_cycle'>('next_cycle');
  const [processingChange, setProcessingChange] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Lista de planos
  const plans: Plan[] = [
    {
      id: 'plano_basico_mensal',
      name: 'Plano Básico',
      price: 19.99,
      currency: 'BRL',
      interval: 'mensal',
      description: 'Ideal para iniciantes',
      features: [
        'Acesso ao Maguinho via WhatsApp',
        'Controle financeiro básico',
        'Registro de despesas e receitas',
        'Relatórios mensais simples'
      ]
    },
    {
      id: 'plano_premium_mensal',
      name: 'Plano Premium',
      price: 49.90,
      currency: 'BRL',
      interval: 'mensal',
      description: 'Para quem quer controle total',
      features: [
        'Tudo do plano básico',
        'Categorização automática avançada',
        'Relatórios detalhados e personalizados',
        'Metas financeiras',
        'Suporte prioritário'
      ],
      popular: true
    },
    {
      id: 'plano_basico_trimestral',
      name: 'Plano Básico',
      price: 54.97,
      currency: 'BRL',
      interval: 'trimestral',
      description: 'Ideal para iniciantes',
      features: [
        'Acesso ao Maguinho via WhatsApp',
        'Controle financeiro básico',
        'Registro de despesas e receitas',
        'Relatórios mensais simples'
      ]
    },
    {
      id: 'plano_premium_trimestral',
      name: 'Plano Premium',
      price: 144.70,
      currency: 'BRL',
      interval: 'trimestral',
      description: 'Para quem quer controle total',
      features: [
        'Tudo do plano básico',
        'Categorização automática avançada',
        'Relatórios detalhados e personalizados',
        'Metas financeiras',
        'Suporte prioritário'
      ],
      popular: true
    },
    {
      id: 'plano_basico_anual',
      name: 'Plano Básico',
      price: 219.88,
      currency: 'BRL',
      interval: 'anual',
      description: 'Ideal para iniciantes',
      features: [
        'Acesso ao Maguinho via WhatsApp',
        'Controle financeiro básico',
        'Registro de despesas e receitas',
        'Relatórios mensais simples'
      ]
    },
    {
      id: 'plano_premium_anual',
      name: 'Plano Premium',
      price: 578.80,
      currency: 'BRL',
      interval: 'anual',
      description: 'Para quem quer controle total',
      features: [
        'Tudo do plano básico',
        'Categorização automática avançada',
        'Relatórios detalhados e personalizados',
        'Metas financeiras',
        'Suporte prioritário'
      ],
      popular: true
    }
  ];

  // Declaração para o SDK do Mercado Pago
  declare global {
    interface Window {
      MercadoPago: any;
    }
  }

  // Filtrar planos com base no intervalo de cobrança selecionado
  const filteredPlans = plans.filter(plan => plan.interval === billingInterval);

  // Mapear identificadores de plano
  const planMapping = {
    'plano_basico_mensal': 'a5a5429c-0046-4d70-86c6-52b9383a5460',
    'plano_premium_mensal': '8a0f4a60-8966-4e64-b2ce-7810b30017ac',
    'plano_basico_trimestral': '3f7887ff-5914-4241-86ae-e61bce4abd9a',
    'plano_premium_trimestral': '3c981d6d-acc3-48f1-986b-f6f3688da104',
    'plano_basico_anual': '70a817e3-b3a4-4fdc-a669-b633a23003a6',
    'plano_premium_anual': 'b565a275-88de-497a-8517-82e1591aa4a0'
  };

  // Mapeamento reverso para obter o ID do plano a partir do UUID
  const reversePlanMapping = {
    'a5a5429c-0046-4d70-86c6-52b9383a5460': 'plano_basico_mensal',
    '8a0f4a60-8966-4e64-b2ce-7810b30017ac': 'plano_premium_mensal',
    '3f7887ff-5914-4241-86ae-e61bce4abd9a': 'plano_basico_trimestral',
    '3c981d6d-acc3-48f1-986b-f6f3688da104': 'plano_premium_trimestral',
    '70a817e3-b3a4-4fdc-a669-b633a23003a6': 'plano_basico_anual',
    'b565a275-88de-497a-8517-82e1591aa4a0': 'plano_premium_anual'
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.error('Tentativa de acesso não autorizado à página de gerenciamento de assinatura. Redirecionando para login...');
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
        
        // Buscar assinatura ativa do usuário
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();
          
        if (subscriptionError) {
          console.error('Erro ao buscar assinatura:', subscriptionError);
          navigate('/subscription');
          return;
        }
        
        if (!subscriptionData) {
          // Se não tiver assinatura, redirecionar para a página de assinatura
          navigate('/subscription');
          return;
        }
        
        setSubscription(subscriptionData);
        
        // Buscar detalhes do plano no banco
        if (subscriptionData.plan_id) {
          setLoadingPlans(true);
          const { data: planData, error: planError } = await supabase
            .from('plans')
            .select('*')
            .eq('id', subscriptionData.plan_id)
            .single();
            
          if (planError) {
            console.error('Erro ao buscar dados do plano:', planError);
          } else {
            setDBPlan(planData);
            
            // Identificar o plano na lista de planos com base no ID do banco
            const planId = reversePlanMapping[subscriptionData.plan_id];
            if (planId) {
              const currentPlanObj = plans.find(p => p.id === planId);
              if (currentPlanObj) {
                setCurrentPlan(currentPlanObj);
                
                // Definir o intervalo de cobrança baseado no plano atual
                if (currentPlanObj.interval === 'mensal' || currentPlanObj.interval === 'trimestral' || currentPlanObj.interval === 'anual') {
                  setBillingInterval(currentPlanObj.interval);
                }
              }
            }
          }
          setLoadingPlans(false);
        }
        
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    
    // Carregar o script do Mercado Pago
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // Limpar script ao desmontar o componente
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [navigate]);

  const handleSelectPlan = (plan: Plan) => {
    // Não permitir selecionar o plano atual
    if (currentPlan && plan.id === currentPlan.id) {
      return;
    }
    setSelectedPlan(plan);
    setError(null);
    setSuccess(null);
    setPreferenceId(null);
  };

  const calculatePriceDifference = () => {
    if (!currentPlan || !selectedPlan) return 0;
    
    return selectedPlan.price - currentPlan.price;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const createPaymentPreference = async () => {
    if (!user || !selectedPlan || !currentPlan || !subscription) return;
    
    setProcessingChange(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Obter a sessão para o token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      // Mapear o ID do plano para o formato esperado pela API
      const dbPlanId = planMapping[selectedPlan.id];
      
      if (!dbPlanId) {
        throw new Error('ID do plano inválido');
      }
      
      // Chamar a Edge Function para criar a preferência de pagamento
      const response = await fetch('/api/create-payment-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          planPrice: selectedPlan.price,
          planInterval: selectedPlan.interval,
          userName: user.name || user.email,
          
          // Dados específicos para troca de plano
          isPlanChange: true,
          currentSubscriptionId: subscription.id,
          currentPlanId: currentPlan.id,
          currentPlanEndDate: subscription.end_date,
          isImmediate: changeOption === 'immediate'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar preferência de pagamento');
      }
      
      const data = await response.json();
      setPreferenceId(data.preferenceId);
      
      // Inicializa o checkout do Mercado Pago
      if (window.MercadoPago && data.preferenceId) {
        const mp = new window.MercadoPago('APP_USR-ba29b5dc-0ed5-4a3d-8ad1-34da5849af2b', {
          locale: 'pt-BR'
        });
        
        mp.checkout({
          preference: {
            id: data.preferenceId
          },
          render: {
            container: '.checkout-button',
            label: 'Confirmar alteração'
          },
          theme: {
            elementsColor: '#00E7C1',
            headerColor: '#00E7C1'
          }
        });
      }
    } catch (error: any) {
      console.error('Erro ao processar mudança de plano:', error);
      setError(error.message || 'Erro ao processar mudança de plano. Por favor, tente novamente.');
    } finally {
      setProcessingChange(false);
    }
  };

  const handleChangePlan = async () => {
    if (changeOption === 'next_cycle') {
      // Para mudanças no próximo ciclo, apenas atualizamos o registro no banco
      setProcessingChange(true);
      setError(null);
      setSuccess(null);
      
      try {
        if (!subscription || !selectedPlan) {
          throw new Error('Dados insuficientes para atualizar a assinatura');
        }

        // Mapear o ID do plano para o formato esperado pela API
        const dbPlanId = planMapping[selectedPlan.id];
        
        if (!dbPlanId) {
          throw new Error('ID do plano inválido');
        }
        
        // Atualizar a assinatura no banco com o novo plano e flag de mudança
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            future_plan_id: dbPlanId,
            plan_change_scheduled: true,
            last_modified_reason: 'plan_change_scheduled'
          })
          .eq('id', subscription.id);
          
        if (updateError) {
          throw new Error('Erro ao agendar mudança de plano: ' + updateError.message);
        }
        
        // Registrar a mudança na tabela subscription_changes
        const { error: changeError } = await supabase
          .from('subscription_changes')
          .insert({
            subscription_id: subscription.id,
            from_plan_id: subscription.plan_id,
            to_plan_id: dbPlanId,
            change_type: 'scheduled',
            reason: 'user_initiated',
            effective_date: subscription.end_date
          });
          
        if (changeError) {
          console.error('Erro ao registrar mudança:', changeError);
          // Não impede o fluxo principal, apenas loga o erro
        }
        
        setSuccess(`Mudança de plano agendada com sucesso para ${formatDate(subscription.end_date)}!`);
      } catch (error: any) {
        console.error('Erro ao agendar mudança de plano:', error);
        setError(error.message || 'Erro ao agendar mudança de plano. Por favor, tente novamente.');
      } finally {
        setProcessingChange(false);
      }
    } else {
      // Para mudanças imediatas, chamamos a função de criar preferência
      await createPaymentPreference();
    }
  };

  if (loading || loadingPlans) {
    return (
      <div className="min-h-screen bg-[#0C0D0F] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0D0F] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Voltar para Dashboard</span>
        </button>
        
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Gerenciar Assinatura</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Visualize seu plano atual e explore outras opções para melhor atender suas necessidades.
          </p>
        </div>
        
        {currentPlan && subscription && (
          <div className="bg-gradient-to-r from-[#1C1E21] to-[#1C1E21]/80 rounded-lg p-6 mb-8 max-w-3xl mx-auto border border-[#2A2D31]">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#00E7C1]" />
              Seu Plano Atual
            </h2>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Plano</span>
                <span className="font-medium">{currentPlan.name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Período</span>
                <span>{currentPlan.interval}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Valor</span>
                <span>R$ {currentPlan.price.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Data de início</span>
                <span>{formatDate(subscription.start_date)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Próxima renovação</span>
                <span>{formatDate(subscription.end_date)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-[#00E7C1] font-medium">
                  Ativo
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-8 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-[#00E7C1]" />
            Alterar Plano
          </h2>
          
          {/* Seletor de intervalo de cobrança */}
          <div className="mb-6 inline-flex p-1 bg-[#1C1E21] rounded-lg">
            <button
              onClick={() => {
                setBillingInterval('mensal');
                setSelectedPlan(null);
                setPreferenceId(null);
              }}
              className={`px-4 py-2 rounded-md ${billingInterval === 'mensal' ? 'bg-[#2A2D31] text-white' : 'text-gray-400'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => {
                setBillingInterval('trimestral');
                setSelectedPlan(null);
                setPreferenceId(null);
              }}
              className={`px-4 py-2 rounded-md ${billingInterval === 'trimestral' ? 'bg-[#2A2D31] text-white' : 'text-gray-400'}`}
            >
              Trimestral
            </button>
            <button
              onClick={() => {
                setBillingInterval('anual');
                setSelectedPlan(null);
                setPreferenceId(null);
              }}
              className={`px-4 py-2 rounded-md ${billingInterval === 'anual' ? 'bg-[#2A2D31] text-white' : 'text-gray-400'}`}
            >
              Anual
            </button>
          </div>
        </div>
        
        {/* Cards de planos */}
        <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-3xl mx-auto">
          {filteredPlans.map((plan) => (
            <div 
              key={plan.id}
              className={`bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border ${
                plan.popular 
                  ? 'border-[#00E7C1]/50 ring-1 ring-[#00E7C1]/20' 
                  : 'border-[#2A2D31]/50'
              } ${
                currentPlan?.id === plan.id 
                  ? 'border-blue-500/50 ring-1 ring-blue-500/20' 
                  : selectedPlan?.id === plan.id
                    ? 'border-orange-500/50 ring-1 ring-orange-500/20'
                    : ''
              } p-6 relative hover:border-gray-500 transition-colors cursor-pointer`}
              onClick={() => handleSelectPlan(plan)}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-[#00E7C1] text-black text-xs font-medium px-3 py-1 rounded-bl-lg rounded-tr-lg">
                  Popular
                </div>
              )}
              
              {currentPlan?.id === plan.id && (
                <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-br-lg rounded-tl-lg">
                  Plano Atual
                </div>
              )}
              
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-gray-400 mb-4">{plan.description}</p>
              
              <div className="mb-6">
                <span className="text-3xl font-bold">R$ {plan.price.toFixed(2)}</span>
                <span className="text-gray-400">/{plan.interval}</span>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check size={18} className="text-[#00E7C1] mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div
                className={`w-full py-3 rounded-lg font-medium transition-colors text-center ${
                  currentPlan?.id === plan.id
                    ? 'bg-blue-500/30 text-white cursor-not-allowed'
                    : selectedPlan?.id === plan.id
                      ? 'bg-[#00E7C1] text-black'
                      : 'bg-[#2A2D31] text-white'
                }`}
              >
                {currentPlan?.id === plan.id 
                  ? 'Plano Atual' 
                  : selectedPlan?.id === plan.id 
                    ? 'Plano Selecionado' 
                    : 'Selecionar Plano'}
              </div>
            </div>
          ))}
        </div>
        
        {selectedPlan && currentPlan && (
          <div className="max-w-3xl mx-auto">
            {/* Opções de mudança */}
            <div className="bg-[#1C1E21] rounded-lg p-6 mb-8 border border-[#2A2D31]">
              <h3 className="text-xl font-bold mb-4">Quando aplicar a mudança</h3>
              
              <div className="space-y-4">
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer ${
                    changeOption === 'immediate' 
                      ? 'border-[#00E7C1] bg-[#00E7C1]/10' 
                      : 'border-[#2A2D31] hover:border-gray-500'
                  }`}
                  onClick={() => {
                    setChangeOption('immediate');
                    setPreferenceId(null);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      changeOption === 'immediate' ? 'border-[#00E7C1]' : 'border-gray-500'
                    }`}>
                      {changeOption === 'immediate' && (
                        <div className="w-3 h-3 rounded-full bg-[#00E7C1]"></div>
                      )}
                    </div>
                    <div className="font-medium">Imediatamente</div>
                  </div>
                  <p className="ml-8 text-sm text-gray-400 mt-1">
                    {calculatePriceDifference() > 0
                      ? 'Você será cobrado proporcionalmente pela diferença entre os planos.'
                      : 'Você receberá crédito proporcional pela diferença entre os planos.'}
                  </p>
                </div>
                
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer ${
                    changeOption === 'next_cycle' 
                      ? 'border-[#00E7C1] bg-[#00E7C1]/10' 
                      : 'border-[#2A2D31] hover:border-gray-500'
                  }`}
                  onClick={() => {
                    setChangeOption('next_cycle');
                    setPreferenceId(null);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      changeOption === 'next_cycle' ? 'border-[#00E7C1]' : 'border-gray-500'
                    }`}>
                      {changeOption === 'next_cycle' && (
                        <div className="w-3 h-3 rounded-full bg-[#00E7C1]"></div>
                      )}
                    </div>
                    <div className="font-medium">No próximo ciclo de faturamento</div>
                  </div>
                  <p className="ml-8 text-sm text-gray-400 mt-1">
                    A mudança ocorrerá em {formatDate(subscription?.end_date || '')}, sem cobranças adicionais até lá.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Resumo da mudança */}
            <div className="bg-[#1C1E21] rounded-lg p-6 mb-8 border border-[#2A2D31]">
              <h3 className="text-xl font-bold mb-4">Resumo da mudança</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">De</span>
                  <span>{currentPlan.name} ({currentPlan.interval})</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Para</span>
                  <span>{selectedPlan.name} ({selectedPlan.interval})</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Preço atual</span>
                  <span>R$ {currentPlan.price.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Novo preço</span>
                  <span>R$ {selectedPlan.price.toFixed(2)}</span>
                </div>
                
                <div className="border-t border-[#2A2D31] my-4"></div>
                
                <div className="flex justify-between font-medium">
                  <span>Diferença</span>
                  <span className={calculatePriceDifference() >= 0 ? 'text-orange-400' : 'text-[#00E7C1]'}>
                    {calculatePriceDifference() >= 0 ? '+' : ''}
                    R$ {calculatePriceDifference().toFixed(2)}
                  </span>
                </div>
                
                {changeOption === 'immediate' && calculatePriceDifference() !== 0 && (
                  <div className="flex items-start gap-2 text-sm mt-4 p-3 bg-[#2A2D31] rounded-lg">
                    <AlertCircle size={18} className={calculatePriceDifference() > 0 ? 'text-orange-400' : 'text-[#00E7C1]'} />
                    <span>
                      {calculatePriceDifference() > 0 
                        ? 'Você será cobrado imediatamente pela diferença proporcional ao tempo restante do ciclo atual.' 
                        : 'Você receberá um crédito proporcional ao tempo restante do ciclo atual.'}
                    </span>
                  </div>
                )}
                
                {changeOption === 'next_cycle' && (
                  <div className="flex items-start gap-2 text-sm mt-4 p-3 bg-[#2A2D31] rounded-lg">
                    <Calendar size={18} className="text-blue-400" />
                    <span>
                      A mudança será aplicada no próximo ciclo de faturamento em {formatDate(subscription?.end_date || '')}.
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-center items-center flex-col gap-4">
              {error && (
                <div className="w-full bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-center">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="w-full bg-green-900/30 border border-green-800 text-green-200 px-4 py-3 rounded-lg text-center">
                  {success}
                </div>
              )}
              
              {!preferenceId ? (
                <button
                  onClick={handleChangePlan}
                  disabled={processingChange || Boolean(success)}
                  className="w-full max-w-md py-4 bg-[#00E7C1] text-black font-bold rounded-lg hover:bg-[#00E7C1]/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {processingChange ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full"></div>
                      <span>Processando...</span>
                    </>
                  ) : success ? (
                    <>
                      <Check size={20} />
                      <span>Plano alterado com sucesso</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar alteração de plano</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="checkout-button w-full max-w-md"></div>
              )}
              
              <p className="text-sm text-gray-400 text-center max-w-md">
                {changeOption === 'immediate'
                  ? 'Ao confirmar, você concorda com a cobrança/reembolso proporcional da diferença entre os planos.'
                  : 'Você continuará com seu plano atual até o final do ciclo de faturamento.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}