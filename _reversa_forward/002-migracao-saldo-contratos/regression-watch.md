# Regression Watch: Feature 002

## Itens Sob Vigilância

- **W001:** Isolamento por cliente: transferências entre contratos de clientes distintos continuam estritamente bloqueadas com `ValidationError`.
- **W002:** Integridade ACID do ledger: todo consumo ou transferência gera par de lançamentos no `HistoricoSaldo` com cálculo exato de `saldo_resultante`.
- **W003:** Auditoria obrigatória: cada operação de saldo emite evento correspondente em `ContratoAuditLog`.
