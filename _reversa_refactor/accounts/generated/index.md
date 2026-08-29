# Catalogo de Oportunidades de Refatoracao - Accounts

> Contexto: `accounts`  
> Atualizado em: 2026-08-29  
> Status do Registro: 4 Aplicadas | 0 Propostas (100% Concluido)

---

## 1. Tabela de Oportunidades Priorizadas por ROI

| # | ID | Verbo | Confianca | Custo | Titulo | Estado |
|---|---|---|---|---|---|---|
| 1 | [`OPP-20260829-ac1g`](../opportunities/OPP-20260829-ac1g.md) | `restructure` | 🟢 Alta | Baixo | Encapsulamento da autenticação e sincronização Google OAuth em serviço dedicado AuthService | `applied` |
| 2 | [`OPP-20260829-ac2m`](../opportunities/OPP-20260829-ac2m.md) | `restructure` | 🟢 Alta | Baixo | Encapsulamento do ciclo de vida de tokens sem senha (Magic Login) e auditoria forense em AuthService | `applied` |
| 3 | [`OPP-20260829-ac3s`](../opportunities/OPP-20260829-ac3s.md) | `simplify` | 🟢 Alta | Baixo | Consolidação da verificação de expiração de token utilizando o método esta_expirado() do modelo | `applied` |
| 4 | [`OPP-20260829-ac4p`](../opportunities/OPP-20260829-ac4p.md) | `standardize` | 🟢 Alta | Baixo | Normalização de imports e adequação PEP 8 em models.py e views.py | `applied` |

---

## 2. Ordem de Ataque Concluida

1. **Passo 1 (Padronização e Limpeza Preliminar):** `OPP-20260829-ac4p` via `/reversa-standardize` - **CONCLUÍDO (APPLIED)**
2. **Passo 2 (Simplificação de Domínio):** `OPP-20260829-ac3s` via `/reversa-simplify` - **CONCLUÍDO (APPLIED)**
3. **Passo 3 (Desacoplamento e Extração de Serviço de Autenticação Google):** `OPP-20260829-ac1g` via `/reversa-restructure` - **CONCLUÍDO (APPLIED)**
4. **Passo 4 (Encapsulamento de Magic Login sem Senha):** `OPP-20260829-ac2m` via `/reversa-restructure` - **CONCLUÍDO (APPLIED)**

---

## 3. Transformações Aplicadas

- [`OPP-20260829-ac4p-padronizacao-imports-pep8`](../transformations/OPP-20260829-ac4p-padronizacao-imports-pep8/transformation.md):
  - **Verbo:** `standardize`
  - **Ganhos:** Eliminação de imports inline no corpo de classes e métodos, padronização PEP 8 e declaração de constante nomeada `MAGIC_LOGIN_EXPIRATION_MINUTES`.
  - **Rede de Segurança:** 31/31 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-ac4p-padronizacao-imports-pep8/CHG-001.diff)

- [`OPP-20260829-ac3s-simplificacao-expiracao-token`](../transformations/OPP-20260829-ac3s-simplificacao-expiracao-token/transformation.md):
  - **Verbo:** `simplify`
  - **Ganhos:** Consumo direto do método `esta_expirado()` nativo do modelo de domínio na camada de verificação HTTP.
  - **Rede de Segurança:** 31/31 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-ac3s-simplificacao-expiracao-token/CHG-001.diff)

- [`OPP-20260829-ac1g-extrair-servico-google-auth`](../transformations/OPP-20260829-ac1g-extrair-servico-google-auth/transformation.md):
  - **Verbo:** `restructure`
  - **Ganhos:** Extração de validação de token OAuth2, checagem B2B, sincronização de perfil e emissão JWT para `AuthService.autenticar_google()`. Redução de `GoogleAuthView.post` de ~105 para ~15 linhas.
  - **Rede de Segurança:** 31/31 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-ac1g-extrair-servico-google-auth/CHG-001.diff)

- [`OPP-20260829-ac2m-extrair-servico-magic-login`](../transformations/OPP-20260829-ac2m-extrair-servico-magic-login/transformation.md):
  - **Verbo:** `restructure`
  - **Ganhos:** Encapsulamento da emissão, validação, expiração e auditoria forense (IP e User-Agent) de Magic Login em `AuthService.solicitar_magic_login` e `AuthService.verificar_magic_login`.
  - **Rede de Segurança:** 31/31 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-ac2m-extrair-servico-magic-login/CHG-001.diff)
