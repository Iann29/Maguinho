-- Tabela para armazenar tentativas de pagamento
CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_price DECIMAL(10, 2) NOT NULL,
  plan_interval TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar assinaturas ativas
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_price DECIMAL(10, 2) NOT NULL,
  plan_interval TEXT NOT NULL,
  status TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_id ON payment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar o campo updated_at
CREATE TRIGGER set_updated_at_payment_attempts
BEFORE UPDATE ON payment_attempts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_subscriptions
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Permissões RLS (Row Level Security)
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas para payment_attempts
CREATE POLICY "Usuários podem ver suas próprias tentativas de pagamento"
  ON payment_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Políticas para subscriptions
CREATE POLICY "Usuários podem ver suas próprias assinaturas"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Políticas para serviço (para uso pelas Edge Functions)
CREATE POLICY "Service pode inserir tentativas de pagamento"
  ON payment_attempts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service pode atualizar tentativas de pagamento"
  ON payment_attempts FOR UPDATE
  USING (true);

CREATE POLICY "Service pode inserir assinaturas"
  ON subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service pode atualizar assinaturas"
  ON subscriptions FOR UPDATE
  USING (true);
