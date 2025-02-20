import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function RegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulação de delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Form submitted');
    setLoading(false);
  };

  // Variants para o container com efeito de stagger (entradas escalonadas)
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  // Variants para cada item que vai animar
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div 
      className="max-w-7xl mx-auto px-4 min-h-screen flex flex-col"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mt-8 transition-colors"
        variants={itemVariants}
      >
        <ArrowLeft size={20} />
        Voltar
      </motion.button>
      
      <motion.div className="max-w-md mx-auto w-full flex-1 mt-8" variants={itemVariants}>
        <motion.div>
          <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#00E7C1] to-[#00E7C1]/80 text-transparent bg-clip-text">
            Criar Conta
          </h2>
          <p className="text-gray-400 mb-8">
            Preencha os dados abaixo para criar sua conta
          </p>
        </motion.div>
        
        <motion.div className="bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border border-[#2A2D31]/50 p-8" variants={itemVariants}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.3 } }}
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-6">
              <motion.div variants={itemVariants}>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                  placeholder="Digite seu nome completo"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                  placeholder="Digite seu email"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-300 mb-2">
                  CPF
                </label>
                <input
                  type="text"
                  id="cpf"
                  name="cpf"
                  required
                  className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                  placeholder="000.000.000-00"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                  placeholder="(00) 00000-0000"
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                  placeholder="Digite sua senha"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Mínimo de 8 caracteres
                </p>
              </motion.div>
            </div>

            <motion.div variants={itemVariants}>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00E7C1] text-black px-6 py-3 rounded-lg text-base font-medium hover:bg-[#00E7C1]/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </motion.div>
          </form>
        </motion.div>

        <motion.div className="text-center py-8" variants={itemVariants}>
          <p className="text-sm text-gray-500">
            Já tem uma conta?{' '}
            <button 
              type="button"
              onClick={() => navigate('/login')}
              className="text-[#00E7C1] hover:underline"
            >
              Fazer login
            </button>
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
