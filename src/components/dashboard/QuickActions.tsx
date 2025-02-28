import React from "react";
import { Plus } from "lucide-react";

interface QuickActionsProps {
  // Futuramente podemos adicionar props para controlar ações
  // onNewTransaction: () => void;
  // onViewReports: () => void;
  // onConfigureBudget: () => void;
}

export function QuickActions({}: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      <button className="bg-[#00E7C1] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#00E7C1]/90 transition-colors flex items-center gap-2 hover:shadow-md hover:shadow-[#00E7C1]/20">
        <Plus size={18} />
        Nova Transação
      </button>
      <button className="bg-[#2A2D31] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A2D31]/80 transition-colors hover:shadow-md hover:shadow-white/5">
        Ver Relatórios
      </button>
      <button className="bg-[#2A2D31] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2A2D31]/80 transition-colors hover:shadow-md hover:shadow-white/5">
        Configurar Orçamento
      </button>
    </div>
  );
}
