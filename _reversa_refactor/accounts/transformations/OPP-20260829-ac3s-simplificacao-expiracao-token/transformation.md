---
schema_version: 1
id: OPP-20260829-ac3s
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
  before: "Comparação manual de datas (timezone.now() > token_obj.expira_em) na View"
  after: "Invocação de método de domínio nativo (token_obj.esta_expirado())"
change_set:
  - chg: CHG-001
    file: backend/apps/accounts/views.py
    purpose: Substituir checagem inline de expiração por chamada a token_obj.esta_expirado()
approval:
  by: user
  at: 2026-08-29T03:16:39-03:00
reversible_via:
  - CHG-001.diff
---

### Resumo da Execução

A simplificação algorítmica foi aplicada com sucesso:
1. `backend/apps/accounts/views.py`: A `PasswordlessVerifyView.post` agora consome diretamente `token_obj.esta_expirado()`.
2. A lógica central de expiração do modelo de domínio agora possui consumo ativo em produção.
3. A suíte de 31 testes executou e validou a equivalência exata (100% verde).
