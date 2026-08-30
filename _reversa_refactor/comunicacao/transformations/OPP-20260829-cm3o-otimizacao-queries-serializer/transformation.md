---
schema_version: 1
id: OPP-20260829-cm3o
verb: optimize
state: applied
safety_net:
  kind: existing
  green_before: true
  green_after: true
preservation:
  method: equivalence-proof
  evidence:
    - before-after/evidence.md
    - safety-net/test-report.md
measurement:
  before: 20 queries SQL na serialização de thread com 20 comentários (O(N))
  after: 0 queries SQL adicionais durante serialização (O(1))
change_set:
  - chg: CHG-001
    file: backend/apps/comunicacao/serializers.py
    purpose: Extração de BaseComentarioSerializer e avaliação em memória de reações e autor via prefetch
approval:
  by: user
  at: 2026-08-29T03:45:00-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

1. **Extração de `BaseComentarioSerializer`:** Unificação do mapeamento de dados do autor e métodos calculados `get_reacoes_count` e `get_user_reacted`.
2. **Avaliação em Memória O(1):** Utilização de `len(obj.reacoes.all())` e `any(...)` verificando `_prefetched_objects_cache` para evitar que o RelatedManager dispare novas consultas SQL no banco.
3. **Resiliência de Contexto:** Acesso defensivo ao usuário da requisição via `getattr(request, 'user', None)`.
