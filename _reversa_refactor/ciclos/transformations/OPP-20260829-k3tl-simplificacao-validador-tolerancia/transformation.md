---
schema_version: 1
id: OPP-20260829-k3tl
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
  before: "Lógica de cálculo e verificação de tolerância de 30% aninhada no corpo de aceitar_ciclo"
  after: "CicloService.validar_tolerancia_horas isolando a regra matemática e simplificando aceitar_ciclo"
change_set:
  - chg: CHG-001
    file: backend/apps/ciclos/services.py
    purpose: Adiciona CicloService.validar_tolerancia_horas e simplifica CicloService.aceitar_ciclo
approval:
  by: user
  at: "2026-08-29T01:01:36-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação simplificou o método `CicloService.aceitar_ciclo`, extraindo a regra de negócio de política de tolerância de horas (+30%) para o validador puro `CicloService.validar_tolerancia_horas`.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Validação da suíte com 73 testes verdes.
2. **Implementação do Validador:** Criação de `CicloService.validar_tolerancia_horas` em `apps/ciclos/services.py`.
3. **Refatoração do Aceite:** Simplificação de `CicloService.aceitar_ciclo`.
4. **Verificação da Rede de Segurança:** Execução completa dos 73 testes com 100% de sucesso.
