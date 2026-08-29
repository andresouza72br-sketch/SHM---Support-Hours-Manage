---
schema_version: 1
id: OPP-20260829-ac4p
verb: standardize
state: applied
safety_net:
  kind: existing
  green_before: true
  green_after: true
preservation:
  method: pattern-only
  evidence:
    - safety-net/test-report.md
    - before-after/evidence.md
measurement:
  before: "import uuid e timezone inline no corpo da classe/função; ausência de constantes"
  after: "Imports normalizados no topo dos arquivos e constante MAGIC_LOGIN_EXPIRATION_MINUTES declarada"
change_set:
  - chg: CHG-001
    file: backend/apps/accounts/models.py
    purpose: Normalizar imports no topo e remover import uuid e timezone do corpo da classe/método
  - chg: CHG-001
    file: backend/apps/accounts/views.py
    purpose: Centralizar imports no topo, remover imports dinâmicos e declarar constante de expiração
approval:
  by: user
  at: 2026-08-29T03:05:56-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Execução

A padronização foi aplicada com sucesso sem alterar qualquer semântica ou regra de negócio:

1. `backend/apps/accounts/models.py`:
   - `import uuid` e `from django.utils import timezone` foram movidos para o cabeçalho do arquivo.
   - Removidas as declarações internas na classe `PasswordlessLoginToken` e método `esta_expirado()`.
2. `backend/apps/accounts/views.py`:
   - Imports de `timedelta`, `timezone`, `PasswordlessLoginToken`, `get_client_ip` e `get_client_user_agent` foram consolidados no topo.
   - Declarada a constante `MAGIC_LOGIN_EXPIRATION_MINUTES = 15`.
   - Removidos os blocos de import inline em `PasswordlessRequestView.post` e `PasswordlessVerifyView.post`.
3. Execução da suíte de testes com 31/31 testes aprovados (100% verde).
