---
schema_version: 1
id: OPP-20260829-nt3s
verb: simplify
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
  before: Consultas duplicadas a User e checagens redundantes de nome/fantasia em 3 métodos (~55 linhas repetidas)
  after: Helpers centralizados _obter_info_autor_e_origem e _obter_destinatarios_envolvidos
change_set:
  - chg: CHG-001
    file: backend/apps/notificacoes/services.py
    purpose: Unificação de rotinas de extração de remetente e busca de usuários envolvidos
approval:
  by: user
  at: 2026-08-29T04:11:45-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

1. **Helpers de Domínio:** Criação dos métodos `_obter_info_autor_e_origem` e `_obter_destinatarios_envolvidos`.
2. **Reaproveitamento:** Simplificação de `notificar_novo_pedido`, `notificar_novo_comentario` e `notificar_evento_ciclo`.
3. **Equivalência Funcional:** Preservação estrita das regras de descarte do autor e inclusão de operador de ciclo.
