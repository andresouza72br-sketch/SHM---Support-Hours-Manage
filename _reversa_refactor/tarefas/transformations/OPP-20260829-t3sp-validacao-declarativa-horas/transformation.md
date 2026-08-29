---
schema_version: 1
id: OPP-20260829-t3sp
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
  before: Serializer generico sem validadores de piso para horas ou sanitizacao de descricoes
  after: Validadores declarativos min_value adicionados em horas_estimadas e horas_realizadas
change_set:
  - chg: CHG-001
    file: backend/apps/tarefas/serializers.py
    purpose: Adicao de validacoes declarativas de horas nao-negativas e saneamento de texto
approval:
  by: user
  at: 2026-08-29T02:09:00-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformacao

1. **Validacao Declarativa:** Configuracao explicita de `min_value=Decimal("0.00")` para campos decimais de tempo no `TarefaSerializer`.
2. **Sanitizacao:** Implementacao do metodo `validate_descricao` para garantir que textos vazios ou preenchidos apenas com espacos sejam rejeitados.
3. **Preservacao:** A suite de testes automatizados executou 100% verde (14/14 testes aprovados).
