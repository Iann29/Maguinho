import React from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, CheckCircle2, Calendar, BarChart3, BookOpen } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  billing_interval: string;
  description: string;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface SubscriptionCardProps {
  subscription: Subscription | null;
  plan: Plan | null;
}

export function SubscriptionCard({ subscription, plan }: SubscriptionCardProps) {
  const navigate = useNavigate();
  
  if (!subscription || !plan) {
    return (
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
    );
  }

  // Verificar se é plano premium ou básico para aplicar estilos diferentes
  const isPremium = plan.name.toLowerCase().includes('premium');
  
  // Definir cores e estilos com base no tipo de plano
  const cardStyles = isPremium 
    ? "bg-gradient-to-r from-[#8A2BE2]/20 to-transparent rounded-lg p-6 mb-6 border border-[#8A2BE2]/30"
    : "bg-gradient-to-r from-[#00E7C1]/20 to-transparent rounded-lg p-6 mb-6 border border-[#00E7C1]/30";
  
  const iconColor = isPremium ? "text-[#8A2BE2]" : "text-[#00E7C1]";
  const buttonBorderColor = isPremium ? "border-[#8A2BE2]/30" : "border-[#00E7C1]/30";
  const buttonTextColor = isPremium ? "text-[#8A2BE2]" : "text-[#00E7C1]";
  const buttonHoverBg = isPremium ? "hover:bg-[#8A2BE2]/10" : "hover:bg-[#00E7C1]/10";
  const statusColor = isPremium ? "text-[#8A2BE2]" : "text-[#00E7C1]";
  
  // Badge para plano premium
  const premiumBadge = isPremium && (
    <span className="absolute -top-3 -right-3 bg-[#8A2BE2] text-white text-xs font-bold px-3 py-1 rounded-full">
      PREMIUM
    </span>
  );

  return (
    <div className={`${cardStyles} relative`}>
      {premiumBadge}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={24} className={iconColor} />
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
                <span className={statusColor + " font-medium"}>Ativo</span>
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
            onClick={() => navigate('/gerenciar-assinatura')}
            className="bg-[#2A2D31] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#2A2D31]/80 transition-colors whitespace-nowrap w-full md:w-auto"
          >
            Gerenciar Assinatura
          </button>
          <button
            onClick={() => window.open('https://www.mercadopago.com.br/subscriptions', '_blank')}
            className={`bg-transparent ${buttonTextColor} border ${buttonBorderColor} px-6 py-2 rounded-lg font-medium ${buttonHoverBg} transition-colors whitespace-nowrap w-full md:w-auto`}
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
            <CheckCircle2 size={20} className={iconColor + " mt-0.5"} />
            <div>
              <h5 className="font-medium">Acesso ilimitado</h5>
              <p className="text-sm text-gray-400">Acesso completo a todos os recursos do Maguinho</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Calendar size={20} className={iconColor + " mt-0.5"} />
            <div>
              <h5 className="font-medium">Planejamento financeiro</h5>
              <p className="text-sm text-gray-400">Ferramentas para planejar seu orçamento mensal</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <BarChart3 size={20} className={iconColor + " mt-0.5"} />
            <div>
              <h5 className="font-medium">Relatórios avançados</h5>
              <p className="text-sm text-gray-400">Visualize relatórios detalhados sobre suas finanças</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <BookOpen size={20} className={iconColor + " mt-0.5"} />
            <div>
              <h5 className="font-medium">Conteúdo educacional</h5>
              <p className="text-sm text-gray-400">Dicas e tutoriais sobre educação financeira</p>
            </div>
          </div>
          
          {/* Recursos adicionais para plano premium */}
          {isPremium && (
            <>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className={iconColor + " mt-0.5"} />
                <div>
                  <h5 className="font-medium">Suporte prioritário</h5>
                  <p className="text-sm text-gray-400">Atendimento preferencial e resposta rápida</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className={iconColor + " mt-0.5"} />
                <div>
                  <h5 className="font-medium">Recursos exclusivos</h5>
                  <p className="text-sm text-gray-400">Acesso a ferramentas avançadas de análise</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
