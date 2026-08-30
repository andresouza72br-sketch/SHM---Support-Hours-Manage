---
schema_version: 1
id: OPP-20260829-nt1m
verb: restructure
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
  before: Método monolítico de ~250 linhas com 3 escadas de if/elif
  after: Decomposição em _montar_payload_evento_ciclo, _obter_destinatarios_email_por_grupo e orquestrador enxuto (~45 linhas)
change_set:
  - chg: CHG-001
    file: backend/apps/notificacoes/services.py
    purpose: Decomposição de notificar_evento_ciclo em métodos auxiliares modulares
approval:
  by: user
  at: 2026-08-29T04:21:29-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

1. **Extract Method:** Criado `_montar_payload_evento_ciclo` para centralizar a criação dos dicionários de dados dos 8 tipos de evento.
2. **Extract Method:** Criado `_obter_destinatarios_email_por_grupo` para isolar a governança B2B de envio de e-mails.
3. **Decompose Conditional:** Orquestrador `notificar_evento_ciclo` tornado linear, limpo e de fácil manutenção e teste.
