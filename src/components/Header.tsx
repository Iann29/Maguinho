import React from 'react';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const navigate = useNavigate();
  
  return (
    <header className="bg-[#1C1E21]/60 backdrop-blur-sm border-b border-[#2A2D31]/50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div 
            className="text-2xl font-bold bg-gradient-to-r from-[#00E7C1] to-[#00E7C1]/80 text-transparent bg-clip-text cursor-pointer"
            onClick={() => navigate('/')}
          >
            Maguinho
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Login
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="bg-[#00E7C1] text-black px-4 py-2 rounded-full hover:bg-[#00E7C1]/90 transition-colors"
            >
              Registro
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
