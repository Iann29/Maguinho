import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
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
      </Routes>
    </Router>
  );
}

export default App;