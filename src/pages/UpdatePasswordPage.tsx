import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkRecoveryCode = async () => {
      try {
        // Tenta pegar o código de várias formas possíveis
        const params = new URLSearchParams(location.search);
        const codeFromQuery = params.get('code');
        const codeFromHash = location.hash.replace('#', '');
        const codeToUse = codeFromQuery || codeFromHash;

        console.log('URL completa:', window.location.href);
        console.log('Código da query:', codeFromQuery);
        console.log('Código do hash:', codeFromHash);
        console.log('Código que será usado:', codeToUse);

        if (!codeToUse) {
          console.error('Nenhum código encontrado na URL');
          setError('Link de recuperação inválido');
          return;
        }

        // Tenta verificar o código
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: codeToUse,
          type: 'recovery'
        });

        console.log('Resposta da verificação:', { data, error: verifyError });

        if (verifyError) {
          console.error('Erro na verificação:', verifyError);
          setError('Link de recuperação inválido ou expirado');
          return;
        }

      } catch (error) {
        console.error('Erro ao processar código de recuperação:', error);
        setError('Erro ao processar o link de recuperação');
      }
    };

    checkRecoveryCode();
  }, [location]);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('As senhas não conferem');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      console.log('Resposta da atualização:', { data, error });

      if (error) throw error;

      navigate('/login', { 
        state: { message: 'Senha atualizada com sucesso! Faça login com sua nova senha.' }
      });
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      setError(error.message || 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="max-w-7xl mx-auto px-4 min-h-screen flex flex-col items-center justify-center gap-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.button
        onClick={() => navigate('/login')}
        className="flex items-center gap-2 text-gray-400 hover:text-[#00E7C1] transition-all duration-200 group"
        variants={itemVariants}
      >
        <ArrowLeft size={20} className="transition-transform duration-200 group-hover:-translate-x-1" />
        <span>Voltar para o login</span>
      </motion.button>
      <motion.div
        className="w-full max-w-lg bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border border-[#2A2D31]/50 p-8"
        variants={itemVariants}
      >
        <motion.h2
          className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#00E7C1] to-[#00E7C1]/80 text-transparent bg-clip-text text-center"
          variants={itemVariants}
        >
          Nova Senha
        </motion.h2>

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
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Nova Senha
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={6}
              className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
              placeholder="Digite sua nova senha"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirme a Nova Senha
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={6}
              className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
              placeholder="Digite novamente sua nova senha"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00E7C1] text-black px-6 py-3 rounded-lg text-base font-medium hover:bg-[#00E7C1]/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </motion.div>
  );
}
