---
schema_version: 1
id: OPP-20260829-c1ac
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
  before: "Lógica de formalização de aceite inline em AceiteContratoView.post sem transação atômica"
  after: "ContratoService.formalizar_aceite decorado com @transaction.atomic e View enxuta"
change_set:
  - chg: CHG-001
    file: backend/apps/contratos/services.py
    purpose: Adiciona ContratoService.formalizar_aceite com suporte transacional atômico e disparo de eventos
  - chg: CHG-002
    file: backend/apps/contratos/views.py
    purpose: Atualiza AceiteContratoView.post para delegar ao ContratoService
approval:
  by: user
  at: "2026-08-29T00:14:53-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação encapsulou o fluxo transacional de formalização de aceite de contrato via Magic Link em `ContratoService.formalizar_aceite`, desacoplando a camada HTTP da lógica de negócio e garantindo atomicidade na transição de status e disparo de notificações.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Validação dos 73 testes verdes da suíte.
2. **Implementação no Serviço:** Criação de `ContratoService.formalizar_aceite` com `@transaction.atomic` em `apps/contratos/services.py`.
3. **Refatoração da View:** Simplificação de `AceiteContratoView.post` em `apps/contratos/views.py`.
4. **Verificação da Rede de Segurança:** Execução completa dos 73 testes com 100% de sucesso.
