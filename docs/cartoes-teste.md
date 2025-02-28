# Cartões de Teste do Mercado Pago

Este documento contém informações sobre os cartões de teste que podem ser usados no ambiente de sandbox do Mercado Pago.

## Cartões para Testes

| Bandeira   | Número do Cartão     | Código de Segurança | Data de Validade | Status do Pagamento |
|------------|----------------------|---------------------|------------------|---------------------|
| Mastercard | 5031 7557 3453 0604  | 123                 | 11/25            | Aprovado            |
| Visa       | 4509 9535 6623 3704  | 123                 | 11/25            | Aprovado            |
| American Express | 3711 8030 3257 522 | 1234            | 11/25            | Aprovado            |
| Mastercard | 5031 1111 1111 6619  | 123                 | 11/25            | Recusado (insuficiente) |
| Mastercard | 5031 1111 1111 6167  | 123                 | 11/25            | Pendente            |

## Como Usar

1. Acesse a página de assinatura do Maguinho
2. Selecione um plano e clique em "Pagar Assinatura"
3. No checkout do Mercado Pago, use um dos cartões de teste acima
4. Para o nome do titular, CPF e endereço, você pode usar dados fictícios
5. Conclua o pagamento

## Testando Diferentes Cenários

### Pagamento Aprovado
Use os cartões marcados como "Aprovado" para simular um pagamento bem-sucedido.

### Pagamento Recusado
Use o cartão marcado como "Recusado" para simular um pagamento que falha por fundos insuficientes.

### Pagamento Pendente
Use o cartão marcado como "Pendente" para simular um pagamento que fica em análise.

## Usuário de Teste

Para testes completos, você pode usar a conta de comprador de teste que você criou no Mercado Pago.

## Observações

- Estes cartões funcionam apenas no ambiente de sandbox do Mercado Pago
- Não é necessário ter saldo real para usar estes cartões
- Os pagamentos feitos com estes cartões não geram cobranças reais
