# Como Criar a Tabela payment_attempts no Supabase

Para completar a integração com o Mercado Pago, precisamos criar a tabela `payment_attempts` no Supabase. Siga os passos abaixo:

## Usando o SQL Editor do Supabase

1. Acesse o [Painel de Controle do Supabase](https://supabase.com/dashboard/project/zssitwbdprfnqglttwhs)
2. Vá para a seção "SQL Editor"
3. Clique em "New Query"
4. Cole o seguinte código SQL:

```sql
-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela para armazenar tentativas de pagamento do Mercado Pago
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

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_payment_attempts_user_id ON payment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status);

-- Triggers para atualizar o campo updated_at
CREATE TRIGGER set_updated_at_payment_attempts
BEFORE UPDATE ON payment_attempts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Permissões RLS (Row Level Security)
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;

-- Políticas para payment_attempts
CREATE POLICY "Usuários podem ver suas próprias tentativas de pagamento"
  ON payment_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Políticas para serviço (para uso pelas Edge Functions)
CREATE POLICY "Service pode inserir tentativas de pagamento"
  ON payment_attempts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service pode atualizar tentativas de pagamento"
  ON payment_attempts FOR UPDATE
  USING (true);
```

5. Clique em "Run" para executar o script

## Verificando se a Tabela Foi Criada

Para verificar se a tabela foi criada corretamente:

1. Vá para a seção "Table Editor" no painel de controle do Supabase
2. Procure pela tabela `payment_attempts` na lista de tabelas
3. Verifique se a tabela tem as colunas esperadas:
   - `id`
   - `user_id`
   - `preference_id`
   - `plan_id`
   - `plan_name`
   - `plan_price`
   - `plan_interval`
   - `status`
   - `created_at`
   - `updated_at`
