import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { signIn } from '../lib/auth';
import { motion } from 'framer-motion';

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await signIn({ email, password });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  // Variants para animações com efeito stagger
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  // Variants para cada item individual
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

      <motion.div className="max-w-md mx-auto mt-8" variants={itemVariants}>
        <motion.h2
          className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#00E7C1] to-[#00E7C1]/80 text-transparent bg-clip-text"
          variants={itemVariants}
        >
          Entrar
        </motion.h2>

        <motion.div
          className="bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border border-[#2A2D31]/50 p-8"
          variants={itemVariants}
        >
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                placeholder="Digite sua senha"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00E7C1] text-black px-6 py-3 rounded-lg text-base font-medium hover:bg-[#00E7C1]/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </motion.div>

            <motion.p className="text-center text-sm text-gray-500" variants={itemVariants}>
              Não tem uma conta?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-[#00E7C1] hover:underline"
              >
                Criar conta
              </button>
            </motion.p>
          </form>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
