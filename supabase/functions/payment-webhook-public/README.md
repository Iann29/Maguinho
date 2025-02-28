# Webhook de Pagamento (Mercado Pago)

Este webhook processa notificações de pagamento e assinatura do Mercado Pago, atualizando o banco de dados do Supabase conforme necessário.

## Estrutura do Código

O código foi refatorado para melhorar a manutenibilidade, seguindo uma estrutura modular:

- **index.ts**: Ponto de entrada principal que recebe as requisições do webhook
- **types.ts**: Definição de interfaces e tipos utilizados em todo o código
- **mercadopago.ts**: Funções para interagir com a API do Mercado Pago
- **database.ts**: Funções para interagir com o banco de dados Supabase
- **payment-processor.ts**: Lógica de processamento de pagamentos e assinaturas

## Fluxo de Processamento

1. **Recebimento da Notificação**: O webhook recebe uma notificação do Mercado Pago
2. **Verificação do Tipo**: Identifica se é um pagamento ou assinatura
3. **Processamento de Pagamento**:
   - Obtém detalhes completos do pagamento da API do Mercado Pago
   - Busca tentativa de pagamento correspondente no banco de dados
   - Identifica o plano correto com base nos metadados e valor
   - Gerencia a assinatura (cria, atualiza ou reativa)
   - Cria registro de pagamento
   - Registra log financeiro
4. **Processamento de Assinatura**:
   - Obtém detalhes da assinatura da API do Mercado Pago
   - Atualiza o status da assinatura no banco de dados

## Variáveis de Ambiente

- `SUPABASE_URL`: URL da instância do Supabase
- `SUPABASE_ANON_KEY`: Chave anônima do Supabase
- `MP_PROD_CLIENT_ID`: Client ID do Mercado Pago
- `MP_PROD_CLIENT_SECRET`: Client Secret do Mercado Pago
- `MP_WEBHOOK_SECRET`: Segredo para verificar assinaturas do webhook

## Melhorias Implementadas

1. **Extração Inteligente do Nome do Plano**:
   - Extrai o nome do plano dos metadados ou descrição do pagamento
   - Garante que planos Premium sejam corretamente identificados

2. **Gerenciamento de Assinaturas**:
   - Verifica assinaturas existentes antes de criar novas
   - Reativa assinaturas inativas quando apropriado
   - Evita duplicação de assinaturas

3. **Logs Financeiros Precisos**:
   - Registra o nome correto do plano nos logs financeiros
   - Inclui informações detalhadas sobre o pagamento

4. **Tratamento de Erros Robusto**:
   - Captura e loga erros em cada etapa do processamento
   - Garante que falhas em uma parte não afetem o restante do fluxo

## Manutenção

Para adicionar novas funcionalidades ou corrigir bugs:

1. Identifique o módulo apropriado para sua alteração
2. Faça as modificações necessárias mantendo a estrutura existente
3. Atualize a documentação conforme necessário
4. Teste as alterações antes de implantar
