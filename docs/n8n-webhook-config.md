# Configuração do Webhook no n8n para o Mercado Pago

Este documento explica como configurar o webhook no n8n para receber notificações do Mercado Pago.

## Configuração no n8n

1. Crie um novo workflow no n8n
2. Adicione um nó "Webhook" como trigger
3. Configure o webhook com os seguintes parâmetros:

### Parâmetros do Webhook

- **HTTP Method**: POST
- **Path**: webhook/mercadopago
- **Authentication**: None
- **Respond**: When Last Node Finishes
- **Response Data**: First Entry JSON

## URL do Webhook

A URL do webhook que deve ser configurada no Mercado Pago é:

```
https://workflows.maguinho.com/webhook-test/webhook/mercadopago
```

## Configuração no Mercado Pago

1. Acesse o [Painel de Desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers)
2. Vá para a seção "Webhooks"
3. Adicione a URL do webhook: `https://workflows.maguinho.com/webhook-test/webhook/mercadopago`
4. Selecione os eventos que deseja receber (pelo menos "Pagamentos")
5. Salve a configuração

## Testando o Webhook

Para testar o webhook:

1. No n8n, clique em "Listen for test event" no nó do webhook
2. Faça um pagamento de teste no ambiente de sandbox do Mercado Pago
3. Verifique se o n8n recebeu a notificação

## Processamento dos Eventos

O n8n receberá os eventos do Mercado Pago e poderá processá-los conforme necessário. Você pode adicionar nós adicionais para:

1. Filtrar os eventos por tipo
2. Atualizar o banco de dados Supabase
3. Enviar notificações por email
4. Executar outras ações com base no status do pagamento
