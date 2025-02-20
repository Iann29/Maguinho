import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Zap, MessageCircle, CreditCard } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginPage } from './pages/LoginPage';
import { RegistrationPage } from './pages/RegistrationPage';

// Layout principal que contém o header e footer
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0C0D0F] text-white">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

// Componente da página inicial
function HomePage() {
  const navigate = useNavigate();
  
  return (
    <main className="max-w-7xl mx-auto px-6 py-16">
      <h1 className="text-5xl font-bold max-w-2xl">
        Seu assistente financeiro pessoal com{' '}
        <span className="bg-gradient-to-r from-[#00E7C1] to-[#00E7C1]/80 text-transparent bg-clip-text">
          inteligência artificial
        </span>
      </h1>
      <p className="mt-6 text-xl text-gray-400 max-w-2xl">
        Mantenha suas finanças organizadas, receba lembretes de contas e mantenha seu orçamento
        em dia — tudo através de mensagens simples no WhatsApp.
      </p>
      <button 
        onClick={() => navigate('/register')}
        className="bg-[#00E7C1] text-black px-8 py-4 rounded-full text-lg font-medium hover:bg-[#00E7C1]/90 transition-colors mt-8"
      >
        Começar Agora →
      </button>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border border-[#2A2D31]/50 p-6">
          <Zap className="text-[#00E7C1] mb-4" size={32} />
          <h3 className="text-xl font-semibold mb-2">Rápido e Fácil</h3>
          <p className="text-gray-400">Interaja naturalmente via WhatsApp para gerenciar suas finanças.</p>
        </div>

        <div className="bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border border-[#2A2D31]/50 p-6">
          <MessageCircle className="text-[#00E7C1] mb-4" size={32} />
          <h3 className="text-xl font-semibold mb-2">Lembretes Inteligentes</h3>
          <p className="text-gray-400">Receba alertas personalizados sobre contas e vencimentos.</p>
        </div>

        <div className="bg-[#1C1E21]/60 backdrop-blur-sm rounded-lg border border-[#2A2D31]/50 p-6">
          <CreditCard className="text-[#00E7C1] mb-4" size={32} />
          <h3 className="text-xl font-semibold mb-2">Controle Total</h3>
          <p className="text-gray-400">Acompanhe seus gastos e mantenha seu orçamento sob controle.</p>
        </div>
      </div>
    </main>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/register" element={<Layout><RegistrationPage /></Layout>} />
        <Route path="/login" element={<Layout><LoginPage /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;