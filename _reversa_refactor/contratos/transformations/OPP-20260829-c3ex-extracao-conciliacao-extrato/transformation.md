---
schema_version: 1
id: OPP-20260829-c3ex
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
  before: "Agregações e apurações financeiras de conciliação inline dentro da action extrato"
  after: "ContratoService.obter_dados_extrato centralizando regras contábeis e View desacoplada"
change_set:
  - chg: CHG-001
    file: backend/apps/contratos/services.py
    purpose: Adiciona ContratoService.obter_dados_extrato
  - chg: CHG-002
    file: backend/apps/contratos/views.py
    purpose: Simplifica action extrato em ContratoViewSet delegando para o serviço
approval:
  by: user
  at: "2026-08-29T00:30:33-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação simplificou a action `extrato` de `ContratoViewSet`, transferindo as agregações de saldo, histórico de ciclos e conciliação contábil para o método `ContratoService.obter_dados_extrato`.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Validação da suíte com 73 testes verdes.
2. **Criação do Método no Serviço:** Implementação de `ContratoService.obter_dados_extrato` em `apps/contratos/services.py`.
3. **Refatoração da View:** Simplificação de `ContratoViewSet.extrato` em `apps/contratos/views.py`.
4. **Verificação da Rede de Segurança:** Execução completa dos 73 testes com 100% de sucesso.
