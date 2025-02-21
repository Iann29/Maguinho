import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export function RegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatch, setPasswordMatch] = useState(true);

  useEffect(() => {
    if (confirmPassword) {
      setPasswordMatch(password === confirmPassword);
    } else {
      setPasswordMatch(true);
    }
  }, [password, confirmPassword]);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const rawCPF = cpf.replace(/\D/g, '');
    const rawPhone = '+55' + phone.replace(/\D/g, '');

    try {
      if (rawCPF.length !== 11) {
        throw new Error('CPF inválido');
      }

      if (rawPhone.length !== 14) {
        throw new Error('Número de telefone inválido');
      }

      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      // Verifica se já existe usuário com o mesmo email, CPF ou telefone
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email, cpf, phone')
        .or(`email.eq."${email}",cpf.eq."${rawCPF}",phone.eq."${rawPhone}"`)
        .maybeSingle();

      if (checkError) {
        throw new Error('Erro ao verificar usuário existente');
      }

      if (existingUser) {
        let errorMessage = 'Já existe um usuário cadastrado com ';
        if (existingUser.email === email) {
          errorMessage += 'este email';
        } else if (existingUser.cpf === rawCPF) {
          errorMessage += 'este CPF';
        } else if (existingUser.phone === rawPhone) {
          errorMessage += 'este telefone';
        }
        throw new Error(errorMessage);
      }

      // Se não existe usuário, cria no Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Insere os dados adicionais na tabela users
        const { error: insertError } = await supabase.from('users').insert({
          id: data.user.id,
          name,
          email,
          cpf: rawCPF,
          phone: rawPhone
        });

        if (insertError) throw insertError;

        navigate('/login', {
          state: {
            message: 'Conta criada com sucesso! Enviamos um email de confirmação para você.'
          }
        });
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro ao criar sua conta.');
      }
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
          Criar Conta
        </motion.h2>

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

          <motion.div variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
            },
          }}>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1] transition-colors"
              placeholder="Digite seu nome completo"
            />
          </motion.div>

          <motion.div variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
            },
          }}>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1] transition-colors"
              placeholder="Digite seu e-mail"
            />
          </motion.div>

          <motion.div variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
            },
          }}>
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

          <motion.div variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
            },
          }}>
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#2A2D31]/50 border border-[#2A2D31] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]"
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirmar Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2.5 bg-[#2A2D31]/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                  !passwordMatch && confirmPassword 
                    ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' 
                    : 'border-[#2A2D31] focus:ring-[#00E7C1]/50 focus:border-[#00E7C1]'
                }`}
                placeholder="Confirme sua senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {!passwordMatch && confirmPassword && (
              <p className="mt-1 text-sm text-red-500">
                As senhas não coincidem
              </p>
            )}
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
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </motion.div>

          <motion.p className="text-center text-sm text-gray-500" variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
            },
          }}>
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
