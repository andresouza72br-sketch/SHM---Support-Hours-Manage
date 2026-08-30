---
schema_version: 1
id: OPP-20260828-m8pc
verb: decouple
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
  before: "6 classes de 3 módulos externos acopladas diretamente dentro de SaldoService; 4 blocos de import dinâmico"
  after: "1 classe externa (ContratoService); 0 imports dinâmicos locais; 83% de redução no acoplamento eferente"
change_set:
  - chg: CHG-001
    file: backend/apps/contratos/services.py
    purpose: Adiciona notificar_e_auditar_migracao_saldo e notificar_e_auditar_compensacao_debito
  - chg: CHG-002
    file: backend/apps/saldo/services.py
    purpose: Delega efeitos colaterais contratuais para ContratoService e remove acoplamento com notificacoes e accounts
approval:
  by: user
  at: "2026-08-29T00:02:26-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação desacoplou o módulo financeiro de saldo de regras de auditoria e mensageria externa, delegando os efeitos colaterais contratuais para `ContratoService` e eliminando todos os imports dinâmicos locais.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Validação da suíte com 73 testes verdes.
2. **Encapsulamento em `ContratoService`:** Criação dos métodos `notificar_e_auditar_migracao_saldo` e `notificar_e_auditar_compensacao_debito` em `apps/contratos/services.py`.
3. **Desacoplamento em `SaldoService`:** Substituição de 6 classes externas e 4 blocos de import inline por delegação direta em `apps/saldo/services.py`.
4. **Verificação da Rede de Segurança:** Execução completa dos 73 testes com 100% de sucesso.
