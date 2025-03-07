import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, CreditCard, Check } from "lucide-react";
import CouponForm from "../components/CouponForm";

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

// Declaração para o SDK do Mercado Pagoo
declare global {
  interface Window {
    MercadoPago: any;
  }
}

export function SubscriptionPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingInterval, setBillingInterval] = useState<'mensal' | 'trimestral' | 'anual'>('mensal');
  // Estados para o cupom
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
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

  // Filtrar planos com base no intervalo de cobrança selecionado
  const filteredPlans = plans.filter(plan => plan.interval === billingInterval);

  // Função para lidar com a aplicação de cupons
  const handleApplyCoupon = (couponData: any) => {
    setAppliedCoupon(couponData.code ? couponData : null);
    if (selectedPlan) {
      setFinalPrice(couponData.finalPrice);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.error('Tentativa de acesso não autorizado à página de assinatura. Redirecionando para login...');
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
        
        // Verificar se já existe uma assinatura ativa
        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();
          
        if (subscription && !subscriptionError) {
          // Usuário já tem uma assinatura ativa
          console.log('Usuário já possui assinatura ativa');
          // Você pode redirecionar ou mostrar uma mensagem diferente
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
      document.body.removeChild(script);
    };
  }, [navigate]);

  // Efeito para atualizar o preço final quando o plano é alterado
  useEffect(() => {
    if (selectedPlan) {
      if (appliedCoupon) {
        // Recalcular o desconto com base no novo plano
        let discountAmount = 0;
        
        if (appliedCoupon.discountType === 'percent') {
          discountAmount = (selectedPlan.price * appliedCoupon.discountValue) / 100;
        } else {
          discountAmount = appliedCoupon.discountValue;
        }
        
        // Garantir que o preço não seja negativo
        const newFinalPrice = Math.max(0, selectedPlan.price - discountAmount);
        setFinalPrice(parseFloat(newFinalPrice.toFixed(2)));
      } else {
        // Sem cupom, o preço final é o preço do plano
        setFinalPrice(selectedPlan.price);
      }
    }
  }, [selectedPlan, appliedCoupon]);

  const createPaymentPreference = async () => {
    if (!user || !selectedPlan) return;
    
    setProcessingPayment(true);
    setError(null);
    
    try {
      // Chamamos uma edge function do Supabase para criar a preferência de pagamento
      // Isso é necessário para não expor chaves de API no frontend
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/create-payment-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          userName: user.name || 'Usuário',
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          planPrice: selectedPlan.price,
          planInterval: selectedPlan.interval,
          // Incluir dados do cupom, se aplicado
          couponCode: appliedCoupon?.code || null,
          originalPrice: selectedPlan.price,
          finalPrice: finalPrice || selectedPlan.price,
          discountAmount: appliedCoupon?.discountAmount || 0
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar preferência de pagamento');
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
            label: 'Continuar para pagamento'
          },
          theme: {
            elementsColor: '#00E7C1',
            headerColor: '#00E7C1'
          }
        });
        
        // Mostrar mensagem de orientação ao usuário
        setProcessingPayment(false);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      setError('Não foi possível processar seu pagamento. Por favor, tente novamente.');
      setProcessingPayment(false);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPreferenceId(null); // Resetar preferenceId ao trocar de plano
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Voltar para Dashboard</span>
        </button>
        
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Escolha seu plano Maguinho</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Controle suas finanças pelo WhatsApp com o Maguinho. Escolha o plano que melhor se adapta às suas necessidades.
          </p>
          
          {/* Seletor de intervalo de cobrança */}
          <div className="mt-8 inline-flex p-1 bg-[#1C1E21] rounded-lg">
            <button
              onClick={() => setBillingInterval('mensal')}
              className={`px-4 py-2 rounded-md ${billingInterval === 'mensal' ? 'bg-[#2A2D31] text-white' : 'text-gray-400'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingInterval('trimestral')}
              className={`px-4 py-2 rounded-md ${billingInterval === 'trimestral' ? 'bg-[#2A2D31] text-white' : 'text-gray-400'}`}
            >
              Trimestral
            </button>
            <button
              onClick={() => setBillingInterval('anual')}
              className={`px-4 py-2 rounded-md ${billingInterval === 'anual' ? 'bg-[#2A2D31] text-white' : 'text-gray-400'}`}
            >
              Anual
            </button>
          </div>
        </div>
        
        {/* Cards de planos */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {filteredPlans.map((plan) => (
            <div 
              key={plan.id}
              className={`bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border ${
                plan.popular 
                  ? 'border-[#00E7C1]/50 ring-1 ring-[#00E7C1]/20' 
                  : 'border-[#2A2D31]/50'
              } p-6 relative`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-[#00E7C1] text-black text-xs font-medium px-3 py-1 rounded-bl-lg rounded-tr-lg">
                  Popular
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
              
              <button
                onClick={() => handleSelectPlan(plan)}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  selectedPlan?.id === plan.id
                    ? 'bg-[#00E7C1] text-black'
                    : 'bg-[#2A2D31] text-white hover:bg-[#2A2D31]/80'
                }`}
              >
                {selectedPlan?.id === plan.id ? 'Plano Selecionado' : 'Selecionar Plano'}
              </button>
            </div>
          ))}
        </div>
        
        {selectedPlan && (
          <div className="max-w-2xl mx-auto">
            {/* Componente de Cupom */}
            <CouponForm 
              originalPrice={selectedPlan.price} 
              onApplyCoupon={handleApplyCoupon} 
            />
            
            {/* Resumo do pedido */}
            <div className="bg-[#1C1E21] rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">Resumo do pedido</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Plano</span>
                  <span>{selectedPlan.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Período</span>
                  <span>{selectedPlan.interval}</span>
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between text-[#00E7C1]">
                    <span>Desconto ({appliedCoupon.code})</span>
                    <span>-R$ {appliedCoupon.discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-[#2A2D31] my-4"></div>
              
              <div className="flex justify-between font-bold text-xl">
                <span>Total</span>
                <span>R$ {(finalPrice || selectedPlan.price).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex justify-center items-center flex-col gap-4">
              {error && (
                <div className="w-full bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-center">
                  {error}
                </div>
              )}
              
              {!preferenceId && (
                <button
                  onClick={createPaymentPreference}
                  disabled={processingPayment}
                  className="w-full max-w-md py-4 bg-[#00E7C1] text-black font-bold rounded-lg hover:bg-[#00E7C1]/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full"></div>
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={20} />
                      <span>Pagar Agora</span>
                    </>
                  )}
                </button>
              )}
              
              <div className="checkout-button w-full max-w-md" style={{ display: preferenceId ? 'block' : 'none' }}></div>
              
              <p className="text-sm text-gray-400 text-center max-w-md">
                Processamento seguro via Mercado Pago. Você será cobrado apenas após a confirmação.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
