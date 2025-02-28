-- Adicionar coluna subscription_id à tabela subscriptions se ela não existir
DO $$
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'subscriptions'
        AND column_name = 'subscription_id'
    ) THEN
        -- Adicionar a coluna se não existir
        ALTER TABLE public.subscriptions ADD COLUMN subscription_id TEXT;
        
        -- Criar índice para melhorar a performance de buscas por subscription_id
        CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_id ON public.subscriptions(subscription_id);
        
        -- Comentário para documentação
        COMMENT ON COLUMN public.subscriptions.subscription_id IS 'ID da assinatura no Mercado Pago';
        
        RAISE NOTICE 'Coluna subscription_id adicionada com sucesso à tabela subscriptions';
    ELSE
        RAISE NOTICE 'Coluna subscription_id já existe na tabela subscriptions';
    END IF;
END
$$;
