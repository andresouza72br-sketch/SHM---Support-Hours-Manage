---
schema_version: 1
id: OPP-20260829-cl3o
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
  before: "Complexidade O(N * 7) queries SQL adicionais por listagem na serialização de links e agregações"
  after: "Complexidade O(1) queries adicionais aproveitando coleções prefetch em memória e cache de instância"
change_set:
  - chg: CHG-001
    file: backend/apps/clientes/serializers.py
    purpose: Otimiza métodos calculados em ClienteSerializer com suporte a prefetch em memória e cache de instância
approval:
  by: user
  at: "2026-08-29T02:34:00-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformacao

A transformação eliminou as consultas redundantes disparadas pelos métodos `get_aceite_token`, `get_aceite_expira_em` e `get_aceite_usado` e otimizou as agregações de contratos e usuários em `ClienteSerializer`, reaproveitando as coleções já carregadas em memória pelo `prefetch_related`.

### Etapas Executadas:

1. **Baseline e Rede de Seguranca:** Validação dos 15 testes verdes da suíte `backend/tests/test_clientes_e_usuarios.py`.
2. **Implementacao da Otimizacao:** Inclusão de `_get_ultimo_aceite_link` com cache de instância e leitura de `_prefetched_objects_cache`.
3. **Verificacao da Rede de Seguranca:** Execução completa dos 15 testes com 100% de sucesso.
