---
schema_version: 1
id: OPP-20260829-cl4u
verb: modularize
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
  before: "Lógica de geração de credenciais, emissão de tokens de 48h e envio de e-mails acoplada na View"
  after: "Métodos dedicados ClienteService.criar_colaborador_com_convite, reenviar_convite_usuario e reenviar_aprovacao_cliente"
change_set:
  - chg: CHG-001
    file: backend/apps/clientes/services.py
    purpose: Adiciona métodos de provisionamento de colaboradores e reenvio de convites em ClienteService
  - chg: CHG-002
    file: backend/apps/clientes/views.py
    purpose: Atualiza actions usuarios, reenviar_convite e reenviar_aprovacao para delegar ao ClienteService
approval:
  by: user
  at: "2026-08-29T02:37:00-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformacao

A transformação modularizou a criação de colaboradores vinculados a clientes, controle de unicidade de username, geração de credenciais temporárias aleatórias, emissão de tokens Passwordless de 48 horas e reenvio de convites/aprovações em métodos coesos da classe `ClienteService`.

### Etapas Executadas:

1. **Baseline e Rede de Seguranca:** Validação dos 15 testes verdes da suíte `backend/tests/test_clientes_e_usuarios.py`.
2. **Implementacao no Servico:** Criação de `criar_colaborador_com_convite`, `reenviar_convite_usuario` e `reenviar_aprovacao_cliente` em `apps/clientes/services.py`.
3. **Refatoracao da View:** Delegação das actions HTTP em `apps/clientes/views.py`.
4. **Verificacao da Rede de Seguranca:** Execução completa dos 15 testes com 100% de sucesso.
