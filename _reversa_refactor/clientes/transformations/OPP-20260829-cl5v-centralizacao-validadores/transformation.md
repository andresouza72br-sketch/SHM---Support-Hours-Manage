---
schema_version: 1
id: OPP-20260829-cl5v
verb: simplify
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
  before: "Lógica de validação dispersa de CPF e CNPJ"
  after: "Validadores matemáticos padronizados e centralizados em apps/clientes/models.py com cobertura total de 73 testes verdes"
change_set:
  - chg: CHG-001
    file: backend/apps/clientes/models.py
    purpose: Padronização dos validadores matemáticos de dígitos verificadores de CPF e CNPJ
approval:
  by: user
  at: "2026-08-29T02:41:00-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformacao

A transformação padronizou e consolidou a validação de documentos fiscais brasileiros (CPF e CNPJ) e confirmou a integridade completa de toda a suíte de testes de regressão do sistema (73 testes em 7 módulos).

### Etapas Executadas:

1. **Baseline e Rede de Seguranca:** Validação dos 15 testes de clientes e 73 testes em todo o repositório.
2. **Implementacao e Padronizacao:** Validação matemática consistente e não invasiva.
3. **Verificacao Global da Rede de Seguranca:** Execução de 73 testes passando com 100% de sucesso.
