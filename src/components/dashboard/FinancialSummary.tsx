import React from "react";
import { Wallet, ArrowUpRight, PieChart, TrendingUp } from "lucide-react";

interface FinancialSummaryProps {
  // Futuramente podemos adicionar props para dados reais
  // balance: number;
  // income: number;
  // expenses: number;
}

export function FinancialSummary({}: FinancialSummaryProps) {
  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Resumo Financeiro</h3>
        <div className="text-sm text-gray-400">
          {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1C1E21] rounded-lg p-5 border border-[#2A2D31] hover:border-blue-500/50 transition-all duration-300 hover:shadow-md hover:shadow-blue-500/10">
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

        <div className="bg-[#1C1E21] rounded-lg p-5 border border-[#2A2D31] hover:border-green-500/50 transition-all duration-300 hover:shadow-md hover:shadow-green-500/10">
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

        <div className="bg-[#1C1E21] rounded-lg p-5 border border-[#2A2D31] hover:border-red-500/50 transition-all duration-300 hover:shadow-md hover:shadow-red-500/10">
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
    </div>
  );
}
