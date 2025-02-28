# Configuração do Mercado Pago para o Maguinho

Este documento explica como configurar o Mercado Pago para o projeto Maguinho, incluindo a configuração de contas de teste e produção.

## Contas de Teste

O Mercado Pago permite criar contas de teste para simular pagamentos sem usar dinheiro real. Você precisará de duas contas:

1. **Conta de Vendedor**: Para receber pagamentos
2. **Conta de Comprador**: Para fazer pagamentos de teste

### Credenciais da Conta de Teste (Vendedor)

```
Public Key: APP_USR-ba29b5dc-0ed5-4a3d-8ad1-34da5849af2b
Access Token: APP_USR-4451217525003945-022718-5caf0f64227417d65d327b2dcb7b7f4c-2293113905
Client ID: 4451217525003945
Client Secret: jkyPkKWNEy0HmDoE4oD3ml7TX6tFWFq2
```

## Configuração do Ambiente

O projeto Maguinho está configurado para alternar entre ambientes de teste e produção usando a variável `MP_ENVIRONMENT` no arquivo `.env.local`.

### Arquivo .env.local

Crie um arquivo `.env.local` na raiz do projeto com o seguinte conteúdo:

```
# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# Mercado Pago - Ambiente de Teste
MP_TEST_PUBLIC_KEY=APP_USR-ba29b5dc-0ed5-4a3d-8ad1-34da5849af2b
MP_TEST_ACCESS_TOKEN=APP_USR-4451217525003945-022718-5caf0f64227417d65d327b2dcb7b7f4c-2293113905
MP_TEST_CLIENT_ID=4451217525003945
MP_TEST_CLIENT_SECRET=jkyPkKWNEy0HmDoE4oD3ml7TX6tFWFq2

# Mercado Pago - Ambiente de Produção
MP_PROD_PUBLIC_KEY=sua_chave_publica_de_producao
MP_PROD_ACCESS_TOKEN=seu_token_de_acesso_de_producao
MP_PROD_CLIENT_ID=seu_client_id_de_producao
MP_PROD_CLIENT_SECRET=seu_client_secret_de_producao

# Mercado Pago - Configuração Atual (altere para TEST ou PROD)
MP_ENVIRONMENT=TEST

# Webhook
MP_WEBHOOK_URL=https://workflows.maguinho.com/webhook-test/webhook/mercadopago
MP_WEBHOOK_SECRET=seu_segredo_de_webhook_do_mercado_pago

# Outras configurações
NODE_ENV=development
```

## Estrutura do Banco de Dados

O Maguinho utiliza as seguintes tabelas para gerenciar assinaturas e pagamentos:

1. **plans**: Armazena os planos disponíveis para assinatura
2. **subscriptions**: Armazena as assinaturas ativas dos usuários
3. **payments**: Armazena os pagamentos confirmados
4. **payment_attempts**: Armazena as tentativas de pagamento do Mercado Pago

### Tabela payment_attempts

Esta tabela é específica para a integração com o Mercado Pago e armazena informações sobre tentativas de pagamento antes de se tornarem pagamentos confirmados.

```sql
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
```

## Fluxo de Pagamento

O fluxo de pagamento com o Mercado Pago funciona da seguinte forma:

1. O usuário seleciona um plano na página de assinatura
2. A aplicação chama a Edge Function `create-payment-preference` para criar uma preferência de pagamento no Mercado Pago
3. A Edge Function registra a tentativa de pagamento na tabela `payment_attempts`
4. O usuário é redirecionado para a página de pagamento do Mercado Pago
5. Após o pagamento, o Mercado Pago envia uma notificação para o webhook configurado
6. O webhook processa a notificação e atualiza o status da tentativa de pagamento
7. Se o pagamento for aprovado, a aplicação cria uma nova assinatura na tabela `subscriptions`

## Configuração do Webhook

### No Mercado Pago

1. Acesse o [Painel de Desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers)
2. Vá para a seção "Webhooks"
3. Adicione a URL do webhook: `https://workflows.maguinho.com/webhook-test/webhook/mercadopago`
4. Selecione os eventos "Pagamentos" para receber notificações
5. Salve a configuração

### No n8n (opcional)

Se você estiver usando o n8n para processar webhooks:

1. Configure um nó de webhook no n8n conforme descrito no arquivo `n8n-webhook-config.md`
2. Certifique-se de que o n8n está acessível pela URL configurada no Mercado Pago

## Testando Pagamentos

Para testar pagamentos no ambiente de sandbox:

1. Use as credenciais de teste configuradas no arquivo `.env.local`
2. Acesse a página de assinatura do Maguinho
3. Selecione um plano e clique em "Pagar Assinatura"
4. Use os cartões de teste fornecidos pelo Mercado Pago:
   - VISA: 4509 9535 6623 3704
   - MASTERCARD: 5031 7557 3453 0604
   - Código de segurança: 123
   - Data de validade: qualquer data futura

## Mudando para Produção

Quando estiver pronto para ir para produção:

1. Obtenha as credenciais de produção no [Painel de Desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers)
2. Atualize o arquivo `.env.local` com as credenciais de produção
3. Altere a variável `MP_ENVIRONMENT` para `PROD`
4. Atualize a URL do webhook no Mercado Pago para a URL de produção
