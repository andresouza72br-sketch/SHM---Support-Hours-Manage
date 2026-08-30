---
schema_version: 1
id: OPP-20260829-ac2m
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
  before: "Lógica de emissão, expiração, auditoria forense e minting JWT duplicada e acoplada dentro de PasswordlessRequestView e PasswordlessVerifyView"
  after: "Lógica encapsulada em AuthService.solicitar_magic_login e AuthService.verificar_magic_login, views reduzidas a 10 linhas"
change_set:
  - chg: CHG-001
    file: backend/apps/accounts/services.py
    purpose: Adicionar métodos solicitar_magic_login e verificar_magic_login em AuthService
  - chg: CHG-001
    file: backend/apps/accounts/views.py
    purpose: Delegar requisição e verificação de token sem senha para AuthService
approval:
  by: user
  at: 2026-08-29T03:22:01-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Execução

1. Criados os métodos estáticos `AuthService.solicitar_magic_login` e `AuthService.verificar_magic_login` em `backend/apps/accounts/services.py`.
2. Encapsulada a validação de token, conferência de token usado, expiração nativa, gravação forense de IP/User-Agent e emissão de JWT.
3. Refatoradas `PasswordlessRequestView` e `PasswordlessVerifyView` em `backend/apps/accounts/views.py` para delegação direta.
4. Suíte de regressão executou com 31/31 testes aprovados (100% verde).
