# Regression Watch: Feature 002

## Itens Sob Vigilância

- **W001:** Isolamento por cliente: transferências entre contratos de clientes distintos continuam estritamente bloqueadas com `ValidationError`.
- **W002:** Integridade ACID do ledger: todo consumo ou transferência gera par de lançamentos no `HistoricoSaldo` com cálculo exato de `saldo_resultante`.
- **W003:** Auditoria obrigatória: cada operação de saldo emite evento correspondente em `ContratoAuditLog`.

## Histórico de re-extrações

### Re-extração 2026-08-30 15:12

| ID | Veredito | Observação |
|----|----------|------------|
| W001 | 🟢 verde | Isolamento por cliente estritamente preservado em `apps/saldo/services.py` e `_reversa_sdd/domain.md#rn-05`. |
| W002 | 🟢 verde | Integridade ACID e paridade de lançamentos no Ledger confirmadas em `_reversa_sdd/domain.md#rn-04` e `apps/saldo/services.py`. |
| W003 | 🟢 verde | Auditoria forense e emissão de eventos em `ContratoAuditLog` confirmadas em `_reversa_sdd/domain.md#rn-08` e `apps/contratos/services.py`. |

