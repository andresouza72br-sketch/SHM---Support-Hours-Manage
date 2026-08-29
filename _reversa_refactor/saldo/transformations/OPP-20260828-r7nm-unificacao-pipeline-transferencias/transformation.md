---
schema_version: 1
id: OPP-20260828-r7nm
verb: restructure
state: applied
safety_net:
  kind: existing
  green_before: true
  green_after: true
preservation:
  method: tests
  evidence:
    - safety-net/test-report.md
    - before-after/evidence.md
measurement:
  before: "95 linhas de lógica contábil e de ledger duplicadas entre 3 métodos de transferência"
  after: "0 linhas duplicadas; primitiva privada única _executar_transferencia_contabil_atomica"
change_set:
  - chg: CHG-001
    file: backend/apps/saldo/services.py
    purpose: Extrai primitiva _executar_transferencia_contabil_atomica e unifica transferir, migrar_saldo_contratos_vencidos e compensar_debito_contrato_anterior
approval:
  by: user
  at: "2026-08-28T23:39:01-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação reestruturou a camada de serviços contábeis de saldo, aplicando o padrão **Extract Method** do catálogo Fowler para unificar a mutação atômica de saldo e a geração das duas entradas obrigatórias no ledger.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Validação da suíte de 73 testes verdes.
2. **Extração da Primitiva Contábil:** Criação da função `_executar_transferencia_contabil_atomica` responsável por:
   - Instanciação de `TransferenciaSaldo`
   - Atualização de `saldo` nos contratos de origem e destino
   - Criação dos registros de `HistoricoSaldo` (`TRANSFERENCIA_ENVIO` e `TRANSFERENCIA_RECEBIMENTO`)
3. **Refatoração dos Métodos:**
   - `SaldoService.transferir`
   - `SaldoService.migrar_saldo_contratos_vencidos`
   - `SaldoService.compensar_debito_contrato_anterior`
4. **Verificação da Rede de Segurança:** Execução completa dos 73 testes com 100% de sucesso.
