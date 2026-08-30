---
schema_version: 1
id: OPP-20260829-t2dc
verb: decouple
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
  before: Zero servicos de dominio para tarefas; regras acopladas diretamente nos ganchos save/delete do ORM
  after: Camada TarefaService introduzida com reducao de 80% do codigo de efeitos colaterais no modelo
change_set:
  - chg: CHG-001
    file: backend/apps/tarefas/services.py
    purpose: Criacao de TarefaService encapsulando regras de negocio e sincronizacao de horas
  - chg: CHG-001
    file: backend/apps/tarefas/models.py
    purpose: Delegacao de save e delete para TarefaService.recalcular_horas_ciclo
approval:
  by: user
  at: 2026-08-29T02:03:00-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformacao

1. **Criacao de Servico:** Criado o arquivo `apps/tarefas/services.py` contendo a classe `TarefaService` com metodos estaticos atômicos.
2. **Desacoplamento do Modelo:** Metodos `save()` e `delete()` de `Tarefa` agora delegam a mutacao de horas do `Ciclo` para `TarefaService.recalcular_horas_ciclo()`.
3. **Preservacao Total:** A suite de 14 testes executou 100% verde sem alteracao de comportamento observavel.
