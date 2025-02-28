-- Script para limpar as tabelas de pagamento e assinatura
-- ATENÇÃO: Este script remove TODOS os dados das tabelas mencionadas

-- Usar CASCADE para ignorar restrições de chave estrangeira
-- A ordem é importante: primeiro as tabelas dependentes, depois as tabelas principais

-- Limpar tabela de pagamentos (depende de subscriptions)
TRUNCATE TABLE public.payments CASCADE;

-- Limpar tabela de assinaturas
TRUNCATE TABLE public.subscriptions CASCADE;

-- Limpar tabela de tentativas de pagamento
TRUNCATE TABLE public.payment_attempts CASCADE;

-- Limpar tabela de logs financeiros
TRUNCATE TABLE public.financial_logs CASCADE;

-- Confirmar que as tabelas foram limpas
SELECT 'financial_logs: ' || COUNT(*) FROM public.financial_logs;
SELECT 'payment_attempts: ' || COUNT(*) FROM public.payment_attempts;
SELECT 'payments: ' || COUNT(*) FROM public.payments;
SELECT 'subscriptions: ' || COUNT(*) FROM public.subscriptions;
