import React from "react";

interface WelcomeMessageProps {
  isNewUser?: boolean;
}

export function WelcomeMessage({ isNewUser = true }: WelcomeMessageProps) {
  return (
    <div className="bg-gradient-to-r from-[#2A2D31] to-[#1C1E21] rounded-lg p-6 border border-[#2A2D31]/80 hover:border-[#00E7C1]/30 transition-all duration-300">
      <h3 className="text-lg font-semibold mb-2">
        Bem-vindo ao Maguinho!
      </h3>
      <p className="text-gray-400 mb-4">
        Comece a organizar suas finanças agora mesmo. Adicione suas transações e acompanhe seus gastos de forma simples e eficiente.
      </p>
      <div className="flex flex-wrap gap-3">
        <button className="bg-[#00E7C1] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#00E7C1]/90 transition-colors hover:shadow-md hover:shadow-[#00E7C1]/20">
          Começar Agora
        </button>
        <button className="bg-transparent text-[#00E7C1] border border-[#00E7C1]/30 px-4 py-2 rounded-lg font-medium hover:bg-[#00E7C1]/10 transition-colors">
          Ver Tutorial
        </button>
      </div>
    </div>
  );
}
