---
schema_version: 1
id: OPP-20260829-cl1a
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
  before: "Lógica de formalização de aceite inline em AceiteClienteView.post sem transação atômica"
  after: "ClienteService.formalizar_aceite decorado com @transaction.atomic e View enxuta"
change_set:
  - chg: CHG-001
    file: backend/apps/clientes/services.py
    purpose: Adiciona ClienteService.formalizar_aceite com suporte transacional atômico e disparo de eventos
  - chg: CHG-002
    file: backend/apps/clientes/views.py
    purpose: Atualiza AceiteClienteView.post para delegar ao ClienteService
approval:
  by: user
  at: "2026-08-29T02:26:00-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformacao

A transformação encapsulou o fluxo transacional de formalização de aceite cadastral via Magic Link em `ClienteService.formalizar_aceite`, desacoplando a camada HTTP da lógica de negócio e garantindo atomicidade na transição de status e disparo de notificações.

### Etapas Executadas:

1. **Baseline e Rede de Seguranca:** Validação dos 15 testes verdes da suíte `backend/tests/test_clientes_e_usuarios.py`.
2. **Implementacao no Servico:** Criação de `ClienteService.formalizar_aceite` com `@transaction.atomic` em `apps/clientes/services.py`.
3. **Refatoracao da View:** Simplificação de `AceiteClienteView.post` em `apps/clientes/views.py`.
4. **Verificacao da Rede de Seguranca:** Execução completa dos 15 testes com 100% de sucesso.
