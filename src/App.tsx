import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { GerenciarAssinaturaPage } from './pages/GerenciarAssinaturaPage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
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
    </div>
  );
}

// Wrapper para o HomePage que fornece o hook useNavigate
function HomePageWrapper() {
  return <Layout><HomePage /></Layout>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePageWrapper />} />
        <Route path="/register" element={<Layout><RegistrationPage /></Layout>} />
        <Route path="/login" element={<Layout><LoginPage /></Layout>} />
        <Route path="/reset-password" element={<Layout><ResetPasswordPage /></Layout>} />
        <Route path="/update-password" element={<Layout><UpdatePasswordPage /></Layout>} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/gerenciar-assinatura" element={<GerenciarAssinaturaPage />} />
        <Route path="/subscription/success" element={<Layout><SubscriptionSuccessPage /></Layout>} />
        <Route path="/subscription/failure" element={<Layout><SubscriptionFailurePage /></Layout>} />
        <Route path="/subscription/pending" element={<Layout><SubscriptionPendingPage /></Layout>} />
      </Routes>
    </Router>
  );
}

// Páginas de retorno do pagamento
function SubscriptionSuccessPage() {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border border-[#2A2D31]/50 p-8">
        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-4">Pagamento Aprovado!</h1>
        <p className="text-gray-400 mb-6">Sua assinatura premium foi ativada com sucesso.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-[#00E7C1] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#00E7C1]/90 transition-colors"
        >
          Ir para Dashboard
        </button>
      </div>
    </div>
  );
}

function SubscriptionFailurePage() {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border border-[#2A2D31]/50 p-8">
        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-4">Pagamento Não Aprovado</h1>
        <p className="text-gray-400 mb-6">Houve um problema ao processar seu pagamento. Por favor, tente novamente.</p>
        <button
          onClick={() => navigate('/subscription')}
          className="bg-[#00E7C1] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#00E7C1]/90 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}

function SubscriptionPendingPage() {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border border-[#2A2D31]/50 p-8">
        <div className="w-16 h-16 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-4">Pagamento Pendente</h1>
        <p className="text-gray-400 mb-6">Seu pagamento está sendo processado. Assim que for confirmado, sua assinatura será ativada.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-[#00E7C1] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#00E7C1]/90 transition-colors"
        >
          Ir para Dashboard
        </button>
      </div>
    </div>
  );
}

export default App;