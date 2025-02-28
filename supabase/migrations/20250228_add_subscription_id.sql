-- Adicionar coluna subscription_id à tabela subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- Criar índice para melhorar a performance de buscas por subscription_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id ON public.subscriptions(subscription_id);

-- Comentário para documentação
COMMENT ON COLUMN public.subscriptions.subscription_id IS 'ID da assinatura no Mercado Pago';
