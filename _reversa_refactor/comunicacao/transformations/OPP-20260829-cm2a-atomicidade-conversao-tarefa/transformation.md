---
schema_version: 1
id: OPP-20260829-cm2a
verb: restructure
state: applied
safety_net:
  kind: characterization
  green_before: true
  green_after: true
preservation:
  method: tests
  evidence:
    - before-after/evidence.md
    - safety-net/test-report.md
change_set:
  - chg: CHG-001
    file: backend/apps/comunicacao/views.py
    purpose: Encapsulamento transacional atômico da conversão de comentário em tarefa técnica
approval:
  by: user
  at: 2026-08-29T03:49:00-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

1. **Introduce Transaction Boundary:** Invocação de `with transaction.atomic():` encapsulando `Tarefa.objects.create` e `comentario.save(update_fields=['tarefa_convertida', 'atualizado_em'])`.
2. **Rede de Segurança:** Criação de teste de caracterização e validação de 7/7 testes verdes.
