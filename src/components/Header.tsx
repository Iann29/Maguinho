import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: Implementar verificação de autenticação
    const checkAuth = async () => {
      try {
        // Aqui virá a nova lógica de autenticação
        const isAuthenticated = false; // Temporário
        if (!isAuthenticated) {
          setUser(null);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setUser(null);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      // TODO: Implementar lógica de logout
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

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
            {user ? (
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00E7C1]/10 hover:bg-[#00E7C1]/20 transition-colors"
              >
                <Menu className="w-5 h-5 text-[#00E7C1]" />
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
