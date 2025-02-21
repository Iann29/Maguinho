import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function RegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const formatCPF = (value: string) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const cpfLength = numbers.slice(0, 11);
    
    // Aplica a máscara
    return cpfLength.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos (DDD + número)
    const phoneLength = numbers.slice(0, 11);
    
    // Aplica a máscara
    if (phoneLength.length <= 2) return phoneLength;
    if (phoneLength.length <= 7) return `(${phoneLength.slice(0, 2)}) ${phoneLength.slice(2)}`;
    return `(${phoneLength.slice(0, 2)}) ${phoneLength.slice(2, 7)}-${phoneLength.slice(7)}`;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedCPF = formatCPF(value);
    setCpf(formattedCPF);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedPhone = formatPhone(value);
    setPhone(formattedPhone);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const rawCPF = cpf.replace(/\D/g, '');
    // Adiciona +55 e remove formatação do telefone
    const rawPhone = '+55' + phone.replace(/\D/g, '');

    try {
      // Primeiro, verificar se já existe usuário com este email, CPF ou telefone
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email, cpf, phone')
        .or(`email.eq.${email},cpf.eq.${rawCPF},phone.eq.${rawPhone}`);

      if (checkError) throw checkError;

      if (existingUser && existingUser.length > 0) {
        const user = existingUser[0];
        if (user.email === email) {
          throw new Error('Este email já está cadastrado. Por favor, use outro email ou faça login.');
        }
        if (user.cpf === rawCPF) {
          throw new Error('Este CPF já está cadastrado. Se você já tem uma conta, faça login.');
        }
        if (user.phone === rawPhone) {
          throw new Error('Este número de telefone já está cadastrado. Por favor, use outro número.');
        }
      }

      // Se chegou aqui, podemos criar o usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          throw new Error('Este email já está cadastrado. Por favor, use outro email ou faça login.');
        }
        throw authError;
      }

      if (authData.user) {
        // Criar o usuário na tabela users
        const { error: userError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              name,
              email,
              cpf: rawCPF,
              phone: rawPhone
            },
          ]);

        if (userError) {
          // Caso ocorra algum erro na inserção, vamos deletar o usuário criado no auth
          await supabase.auth.admin.deleteUser(authData.user.id);
          
          if (userError.message.includes('users_email_key')) {
            throw new Error('Este email já está cadastrado. Por favor, use outro email ou faça login.');
          }
          if (userError.message.includes('users_cpf_key')) {
            throw new Error('Este CPF já está cadastrado. Se você já tem uma conta, faça login.');
          }
          if (userError.message.includes('users_phone_key')) {
            throw new Error('Este número de telefone já está cadastrado. Por favor, use outro número.');
          }
          throw userError;
        }

        // Redirecionar para o login com mensagem sobre confirmação de email
        navigate('/login', {
          state: {
            message: 'Conta criada com sucesso! Por favor, verifique seu email para confirmar sua conta.'
          }
        });
      }
    } catch (err: any) {
      if (err.message?.includes('For security purposes')) {
        setError('Aguarde um momento antes de tentar novamente.');
      } else {
        setError(err.message || 'Ocorreu um erro ao criar sua conta.');
      }
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
          Criar Conta
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
              value={cpf}
              onChange={handleCPFChange}
              maxLength={14}
              className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
              placeholder="000.000.000-00"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
              WhatsApp
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                +55
              </span>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                value={phone}
                onChange={handlePhoneChange}
                maxLength={15}
                className="w-full pl-12 pr-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                placeholder="(11) 98765-4321"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                required
                className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00E7C1] transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00E7C1] text-black px-6 py-3 rounded-lg text-base font-medium hover:bg-[#00E7C1]/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </motion.div>

          <motion.p className="text-center text-sm text-gray-500" variants={itemVariants}>
            Já tem uma conta?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-[#00E7C1] hover:underline"
            >
              Fazer login
            </button>
          </motion.p>
        </form>
      </motion.div>
    </motion.div>
  );
}
