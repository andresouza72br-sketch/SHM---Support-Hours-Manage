---
schema_version: 1
id: OPP-20260828-d3lk
verb: optimize
state: applied
safety_net:
  kind: existing
  green_before: true
  green_after: true
preservation:
  method: equivalence-proof
  evidence:
    - safety-net/test-report.md
    - before-after/evidence.md
measurement:
  before: "2 queries SQL com SELECT ... FOR UPDATE por transferência; risco de Deadlock em concorrência bidirecional"
  after: "1 query SQL unificada com SELECT IN ... FOR UPDATE; ordenação estrita por ID com 0% risco de deadlock"
change_set:
  - chg: CHG-001
    file: backend/apps/saldo/services.py
    purpose: Adiciona _obter_par_contratos_com_lock_ordenado e unifica locks pessimistas em transferir, migrar e compensar
approval:
  by: user
  at: "2026-08-28T23:32:37-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação otimizou o mecanismo de bloqueio pessimista (`select_for_update`) utilizado pelo `SaldoService` para movimentações financeiras entre contratos.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Execução da suíte completa com 73 testes (100% verde).
2. **Implementação da Primitiva Ordenada:** Criação da função auxiliar `_obter_par_contratos_com_lock_ordenado(contrato_origem_id, contrato_destino_id)` que busca e trava os dois contratos em uma única query `select_for_update().filter(id__in=ids_ordenados).order_by("id")`.
3. **Substituição nos Métodos de Transferência:**
   - `SaldoService.transferir`
   - `SaldoService.migrar_saldo_contratos_vencidos`
   - `SaldoService.compensar_debito_contrato_anterior`
4. **Verificação da Rede de Segurança:** Re-execução dos 73 testes com 100% de sucesso.
