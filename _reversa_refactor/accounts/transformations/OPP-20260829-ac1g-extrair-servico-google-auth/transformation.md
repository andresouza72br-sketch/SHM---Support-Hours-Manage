---
schema_version: 1
id: OPP-20260829-ac1g
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
  before: "GoogleAuthView.post com 105 linhas concentrando transporte, Google SDK, regras B2B e persistência"
  after: "GoogleAuthView.post com 15 linhas e regras encapsuladas em AuthService.autenticar_google"
change_set:
  - chg: CHG-001
    file: backend/apps/accounts/services.py
    purpose: Criar AuthService com o método estático autenticar_google
  - chg: CHG-001
    file: backend/apps/accounts/views.py
    purpose: Delegar a autenticação Google OAuth para AuthService
approval:
  by: user
  at: 2026-08-29T03:19:18-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Execução

1. Criado o módulo `backend/apps/accounts/services.py` com a classe de domínio `AuthService`.
2. Extraída toda a lógica de validação de token OAuth2, regras B2B (e-mail verificado, checagem de usuário ativo/cadastrado), sincronização de perfil e geração de JWT para `AuthService.autenticar_google()`.
3. Refatorada a view `GoogleAuthView.post` para delegar estritamente a execução ao serviço e formatar a resposta HTTP.
4. Suíte de testes `test_google_auth.py` executou com 7/7 testes aprovados e compatibilidade total com mocks pré-existentes.
