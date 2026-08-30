---
schema_version: 1
id: OPP-20260829-cm4s
verb: standardize
state: applied
safety_net:
  kind: existing
  green_before: true
  green_after: true
preservation:
  method: pattern-only
  evidence:
    - before-after/evidence.md
    - safety-net/test-report.md
change_set:
  - chg: CHG-001
    file: backend/apps/comunicacao/services.py
    purpose: Instrumentação de logger.warning estruturado com exc_info=True eliminando except pass
approval:
  by: user
  at: 2026-08-29T03:56:00-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

1. **Padronização de Observabilidade:** Substituição do bloco cego `except Exception: pass` por logging estruturado com stack trace em `ComentarioService.criar_comentario`.
