import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.hostname === 'localhost' 
          ? 'http://localhost:5173/update-password'
          : 'https://maguinho.com/update-password'
      });

      if (error) {
        console.error('Erro ao enviar email de recuperação:', error.message);
        setError('Não foi possível enviar o email de recuperação. Por favor, tente novamente.');
        return;
      }

      setSuccess(true);
      console.log('Email de recuperação enviado com sucesso para:', email);
    } catch (err) {
      console.error('Erro inesperado ao solicitar recuperação de senha:', err);
      setError('Ocorreu um erro inesperado. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="max-w-7xl mx-auto px-4 min-h-screen flex flex-col items-center justify-center gap-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.button
        onClick={() => navigate('/login')}
        className="flex items-center gap-2 text-gray-400 hover:text-[#00E7C1] transition-all duration-200 group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ArrowLeft size={20} className="transition-transform duration-200 group-hover:-translate-x-1" />
        <span>Voltar para o login</span>
      </motion.button>

      <motion.div
        className="w-full max-w-lg bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border border-[#2A2D31]/50 p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.h2
          className="text-3xl font-bold mb-6 bg-gradient-to-r from-[#00E7C1] to-[#00E7C1]/80 text-transparent bg-clip-text text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Recuperar Senha
        </motion.h2>

        {success ? (
          <motion.div
            className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="font-medium">Email enviado com sucesso!</p>
            <p className="text-sm mt-1">Verifique sua caixa de entrada para redefinir sua senha.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                placeholder="Digite seu email"
              />
            </div>

            <motion.div variants={{
              hidden: { opacity: 0, y: 20 },
              visible: {
                opacity: 1,
                y: 0,
              },
            }}>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00E7C1] text-black px-6 py-3 rounded-lg text-base font-medium hover:bg-[#00E7C1]/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </motion.div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
