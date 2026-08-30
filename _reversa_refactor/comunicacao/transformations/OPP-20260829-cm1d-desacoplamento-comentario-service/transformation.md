---
schema_version: 1
id: OPP-20260829-cm1d
verb: decouple
state: applied
safety_net:
  kind: existing
  green_before: true
  green_after: true
preservation:
  method: tests
  evidence:
    - before-after/evidence.md
    - safety-net/test-report.md
measurement:
  before: 7 dependências diretas de domínio/infra em ComentarioViewSet
  after: 1 dependência de serviço (ComentarioService) (-85% Ce)
change_set:
  - chg: CHG-001
    file: backend/apps/comunicacao/services.py
    purpose: Criação de ComentarioService encapsulando operações de criação, reações e tarefas
  - chg: CHG-002
    file: backend/apps/comunicacao/views.py
    purpose: Delegação da camada HTTP para ComentarioService
approval:
  by: user
  at: 2026-08-29T03:56:00-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

1. **Extração de `ComentarioService`:** Centralização das operações de criação, toggle de reações e conversão de comentário em tarefa.
2. **Desacoplamento de `ComentarioViewSet`:** Eliminação de dependências diretas de modelos e transações na camada HTTP.
