---
schema_version: 1
id: OPP-20260828-e2qx
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
  before: "Queries de elegibilidade e inadimplência declaradas diretamente dentro de SaldoViewSet"
  after: "ContratoQuerySet encapsulando elegiveis_para_migracao e devedores como métodos de domínio"
change_set:
  - chg: CHG-001
    file: backend/apps/contratos/models.py
    purpose: Define ContratoQuerySet com métodos de consulta de domínio e associa ao model Contrato
  - chg: CHG-002
    file: backend/apps/saldo/views.py
    purpose: Atualiza contratos_elegiveis e contratos_devedores para delegar a consulta ao ContratoQuerySet
approval:
  by: user
  at: "2026-08-28T23:54:39-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação desacoplou a lógica de consulta ORM da camada de apresentação (DRF ViewSet), encapsulando-a dentro de `ContratoQuerySet` no módulo de contratos.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Validação de 73 testes verdes.
2. **Definição de `ContratoQuerySet`:** Implementação dos métodos `elegiveis_para_migracao()` e `devedores()` em `apps/contratos/models.py`.
3. **Refatoração de `SaldoViewSet`:** Simplificação de `contratos_elegiveis` e `contratos_devedores` em `apps/saldo/views.py`.
4. **Verificação da Rede de Segurança:** Execução completa dos 73 testes com 100% de sucesso.
