import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { GlareCard } from './components/ui/glare-card';
import { motion } from 'framer-motion';

// Layout principal que contém o header e footer
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0C0D0F] text-white">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

// Componente da página inicial
function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 sm:mb-16"
      >
        <h1 className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6">
          Controle suas Finanças pelo{' '}
          <span className="bg-gradient-to-r from-[#00E7C1] to-[#00E7C1]/80 text-transparent bg-clip-text">
            WhatsApp
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto px-4 mb-8">
          Acompanhe gastos, gerencie orçamentos e mantenha suas finanças em dia — tudo através de mensagens simples no WhatsApp.
        </p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onClick={() => navigate('/register')}
          className="bg-[#00E7C1] text-black px-8 py-4 rounded-full text-lg font-medium hover:bg-[#00E7C1]/90 transition-colors"
        >
          Começar Agora →
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 max-w-5xl mx-auto">
        <div className="flex justify-center">
          <GlareCard className="flex flex-col items-center justify-center text-center p-4 sm:p-5">
            <svg
              className="w-7 h-7 sm:w-10 sm:h-10 text-[#00E7C1] mb-3 sm:mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Rápido e Fácil</h3>
            <p className="text-sm sm:text-base text-gray-400">
              Interface intuitiva que permite você começar a estudar em segundos
            </p>
          </GlareCard>
        </div>

        <div className="flex justify-center">
          <GlareCard className="flex flex-col items-center justify-center text-center p-4 sm:p-5">
            <svg
              className="w-7 h-7 sm:w-10 sm:h-10 text-[#00E7C1] mb-3 sm:mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Lembretes Inteligentes</h3>
            <p className="text-sm sm:text-base text-gray-400">
              Nunca perca uma sessão de estudo com nossos lembretes personalizados
            </p>
          </GlareCard>
        </div>

        <div className="flex justify-center">
          <GlareCard className="flex flex-col items-center justify-center text-center p-4 sm:p-5">
            <svg
              className="w-7 h-7 sm:w-10 sm:h-10 text-[#00E7C1] mb-3 sm:mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Controle Total</h3>
            <p className="text-sm sm:text-base text-gray-400">
              Personalize seu ambiente de estudo do seu jeito
            </p>
          </GlareCard>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/register" element={<Layout><RegistrationPage /></Layout>} />
        <Route path="/login" element={<Layout><LoginPage /></Layout>} />
        <Route path="/reset-password" element={<Layout><ResetPasswordPage /></Layout>} />
        <Route path="/update-password" element={<Layout><UpdatePasswordPage /></Layout>} />
        {/* Adicionando rota que aceita o código como query param */}
        <Route path="/update-password/:code" element={<Layout><UpdatePasswordPage /></Layout>} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;