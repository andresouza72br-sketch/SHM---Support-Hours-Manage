---
schema_version: 1
id: OPP-20260829-cl2e
verb: restructure
state: applied
safety_net:
  kind: existing
  green_before: true
  green_after: true
preservation:
  method: tests
  evidence:
    - safety-net/test-report.md
    - before-after/evidence.md
measurement:
  before: "Lógica de exclusão e auditoria forense inline em ClienteViewSet._executar_exclusao_cliente"
  after: "ClienteService.excluir_cliente com @transaction.atomic e validações de integridade referencial"
change_set:
  - chg: CHG-001
    file: backend/apps/clientes/services.py
    purpose: Adiciona ClienteService.excluir_cliente com checagem de vínculos, registro em ClienteAuditLog e notificações atômicas
  - chg: CHG-002
    file: backend/apps/clientes/views.py
    purpose: Atualiza ClienteViewSet._executar_exclusao_cliente para delegar ao ClienteService
approval:
  by: user
  at: "2026-08-29T02:31:00-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformacao

A transformação encapsulou o fluxo transacional de exclusão auditada de cliente em `ClienteService.excluir_cliente`, isolando as verificações de integridade referencial (contratos e pedidos), validação de justificativa, gravação de logs forenses em `ClienteAuditLog` e despacho de notificações para a camada de serviço.

### Etapas Executadas:

1. **Baseline e Rede de Seguranca:** Validação dos 15 testes verdes da suíte `backend/tests/test_clientes_e_usuarios.py`.
2. **Implementacao no Servico:** Criação de `ClienteService.excluir_cliente` com `@transaction.atomic` em `apps/clientes/services.py`.
3. **Refatoracao da View:** Simplificação de `ClienteViewSet._executar_exclusao_cliente` em `apps/clientes/views.py`.
4. **Verificacao da Rede de Seguranca:** Execução completa dos 15 testes com 100% de sucesso.
