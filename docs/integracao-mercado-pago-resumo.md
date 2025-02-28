# Resumo da Integração com Mercado Pago

## O que foi feito

1. **Criação da tabela `payment_attempts`**
   - Tabela criada no Supabase para armazenar tentativas de pagamento
   - Configuradas políticas de segurança (RLS) para controle de acesso
   - Criados índices para melhorar a performance

2. **Deploy das Edge Functions**
   - `create-payment-preference`: Cria preferências de pagamento no Mercado Pago
   - `payment-webhook`: Processa notificações de pagamento do Mercado Pago

3. **Documentação**
   - Atualizado o arquivo `estruturabanco.txt` com a definição da tabela
   - Criado documento com instruções para criar a tabela no Supabase
   - Atualizada a documentação sobre o Mercado Pago

## O que falta fazer

1. **Configurar o Webhook no Mercado Pago**
   - Acessar o [Painel de Desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers)
   - Configurar o webhook para apontar para: `https://zssitwbdprfnqglttwhs.functions.supabase.co/payment-webhook`
   - Selecionar os eventos "Pagamentos" para receber notificações

2. **Testar o Fluxo de Pagamento**
   - Usar as credenciais de teste configuradas no arquivo `.env.local`
   - Acessar a página de assinatura do Maguinho
   - Selecionar um plano e clicar em "Pagar Assinatura"
   - Usar os cartões de teste fornecidos pelo Mercado Pago:
     - VISA: 4509 9535 6623 3704
     - MASTERCARD: 5031 7557 3453 0604
     - Código de segurança: 123
     - Data de validade: qualquer data futura

3. **Verificar o Funcionamento**
   - Após o pagamento, verificar se a tabela `payment_attempts` foi atualizada
   - Verificar se a assinatura foi criada na tabela `subscriptions`
   - Verificar se o usuário tem acesso aos recursos premium

## Fluxo de Pagamento

1. O usuário seleciona um plano na página de assinatura
2. A aplicação chama a Edge Function `create-payment-preference` para criar uma preferência de pagamento no Mercado Pago
3. A Edge Function registra a tentativa de pagamento na tabela `payment_attempts`
4. O usuário é redirecionado para a página de pagamento do Mercado Pago
5. Após o pagamento, o Mercado Pago envia uma notificação para o webhook configurado
6. O webhook processa a notificação e atualiza o status da tentativa de pagamento
7. Se o pagamento for aprovado, a aplicação cria uma nova assinatura na tabela `subscriptions`

## Problemas Resolvidos

1. **Erro de configuração do SDK do Mercado Pago**
   - Problema: O SDK do Mercado Pago versão 1.5.16 exigia `client_id` e `client_secret` em vez de `access_token`.
   - Solução: Substituímos o uso do SDK por chamadas diretas à API REST do Mercado Pago usando `fetch`.

2. **Erro de autenticação com o Mercado Pago**
   - Problema: Erro `client.id unauthorized to create preferences` ao tentar criar preferências de pagamento.
   - Solução: Configuramos o código para usar diretamente as credenciais de produção (`MP_PROD_ACCESS_TOKEN`), que são as que estão configuradas para as contas de teste do Mercado Pago.

3. **Confusão entre ambientes de teste e produção**
   - Problema: O código estava tentando usar credenciais de teste (`MP_TEST_*`) que não estavam configuradas corretamente.
   - Solução: Simplificamos o código para usar diretamente as credenciais de produção (`MP_PROD_*`), já que estamos usando contas de teste do Mercado Pago com credenciais de produção.

4. **Verificação de assinatura do webhook**
   - Problema: A verificação da assinatura do webhook não estava implementada corretamente.
   - Solução: Implementamos a verificação básica da assinatura usando o cabeçalho `X-Signature`.

5. **Processamento de notificações de pagamento**
   - Problema: A função `payment-webhook` estava usando dados simulados em vez de buscar os detalhes reais do pagamento.
   - Solução: Implementamos a busca dos detalhes do pagamento diretamente da API do Mercado Pago.

6. **Logs insuficientes para depuração**
   - Problema: Era difícil identificar a causa dos erros sem logs detalhados.
   - Solução: Adicionamos logs detalhados em pontos críticos do código para facilitar a depuração.

## Próximos Passos

1. **Testar o fluxo de pagamento completo**
   - Acesse a página de assinatura e tente realizar um pagamento
   - Verifique se a tabela `payment_attempts` é atualizada corretamente
   - Verifique se a tabela `subscriptions` é atualizada quando o pagamento é aprovado

2. **Configurar o webhook no Mercado Pago**
   - URL do webhook: `https://zssitwbdprfnqglttwhs.functions.supabase.co/payment-webhook`
   - Assinatura secreta: `4f4cdb697583ccb7d156f0513f8b6b27a5a7da8ea009c6c584c39e5bc146a3bb`

3. **Monitorar os logs das funções**
   - Acesse o [Painel de Controle do Supabase](https://supabase.com/dashboard/project/zssitwbdprfnqglttwhs/functions)
   - Verifique os logs das funções para identificar possíveis erros

## Configuração das Variáveis de Ambiente

Para que a integração funcione corretamente, você precisa configurar as seguintes variáveis de ambiente no arquivo `.env.local` e nas Edge Functions do Supabase:

```
SUPABASE_URL=https://zssitwbdprfnqglttwhs.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Credenciais do Mercado Pago (Contas de Teste)
MP_PROD_PUBLIC_KEY=APP_USR-ba29b5dc-0ed5-4a3d-8ad1-34da5849af2b
MP_PROD_ACCESS_TOKEN=APP_USR-4451217525003945-022718-5caf0f64227417d65d327b2dcb7b7f4c-2293113905
MP_PROD_CLIENT_ID=4451217525003945
MP_PROD_CLIENT_SECRET=jkyPkKWNEy0HmDoE4oD3ml7TX6tFWFq2

# Webhook
MP_WEBHOOK_SECRET=4f4cdb697583ccb7d156f0513f8b6b27a5a7da8ea009c6c584c39e5bc146a3bb
```

> **Importante**: Certifique-se de que todas essas variáveis estejam configuradas nas Edge Functions do Supabase.

> **Nota**: Estamos usando as credenciais de produção (`MP_PROD_*`), mesmo para testes, pois estamos trabalhando com contas de teste do Mercado Pago.

Para atualizar as variáveis de ambiente das Edge Functions no Supabase:
1. Acesse o [Painel de Controle do Supabase](https://supabase.com/dashboard/project/zssitwbdprfnqglttwhs)
2. Vá para a seção "Edge Functions"
3. Selecione a função `create-payment-preference`
4. Clique em "Variáveis de Ambiente"
5. Adicione ou atualize as variáveis acima
6. Repita o processo para a função `payment-webhook`

## Atualização da Assinatura Secreta do Webhook

A assinatura secreta gerada pelo Mercado Pago para o webhook é:

```
4f4cdb697583ccb7d156f0513f8b6b27a5a7da8ea009c6c584c39e5bc146a3bb
```

Para configurar esta assinatura secreta, você precisa:

1. Atualizar o arquivo `.env.local` com a nova assinatura:
   ```
   MP_WEBHOOK_SECRET=4f4cdb697583ccb7d156f0513f8b6b27a5a7da8ea009c6c584c39e5bc146a3bb
   ```

2. Atualizar as variáveis de ambiente da Edge Function no Supabase:
   - Acesse o [Painel de Controle do Supabase](https://supabase.com/dashboard/project/zssitwbdprfnqglttwhs)
   - Vá para a seção "Edge Functions"
   - Selecione a função `payment-webhook`
   - Clique em "Variáveis de Ambiente"
   - Adicione ou atualize a variável `MP_WEBHOOK_SECRET` com o valor acima

## URLs das Edge Functions

- `create-payment-preference`: https://zssitwbdprfnqglttwhs.functions.supabase.co/create-payment-preference
- `payment-webhook`: https://zssitwbdprfnqglttwhs.functions.supabase.co/payment-webhook
