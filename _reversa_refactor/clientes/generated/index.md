# Catalogo de Oportunidades de Refatoracao - Clientes

> Contexto: `clientes`  
> Atualizado em: 2026-08-29  
> Status do Registro: 5 Aplicadas | 0 Propostas (100% Concluido)

---

## 1. Tabela de Oportunidades Priorizadas por ROI

| # | ID | Verbo | Confianca | Custo | Titulo | Estado |
|---|---|---|---|---|---|---|
| 1 | [`OPP-20260829-cl1a`](../opportunities/OPP-20260829-cl1a.md) | `restructure` | 🟢 Alta | Baixo | Encapsulamento e atomicidade da formalizacao de aceite cadastral em ClienteService | `applied` |
| 2 | [`OPP-20260829-cl2e`](../opportunities/OPP-20260829-cl2e.md) | `restructure` | 🟢 Alta | Baixo | Encapsulamento da exclusao auditada de cliente e integridade referencial em ClienteService | `applied` |
| 3 | [`OPP-20260829-cl3o`](../opportunities/OPP-20260829-cl3o.md) | `optimize` | 🟢 Alta | Baixo | Eliminacao de consultas redundantes N+1 e otimizacao do ClienteSerializer | `applied` |
| 4 | [`OPP-20260829-cl4u`](../opportunities/OPP-20260829-cl4u.md) | `modularize` | 🟢 Alta | Baixo | Encapsulamento do provisionamento de colaboradores e despacho de convites em servico dedicado | `applied` |
| 5 | [`OPP-20260829-cl5v`](../opportunities/OPP-20260829-cl5v.md) | `simplify` | 🟢 Alta | Baixo | Centralizacao e padronizacao dos validadores matematicos de CPF e CNPJ | `applied` |

---

## 2. Ordem de Ataque Concluida

1. **Passo 1 (Core Transacional do Aceite Cadastral):** `OPP-20260829-cl1a` via `/reversa-restructure` - **CONCLUIDO (APPLIED)**
2. **Passo 2 (Integridade Referencial e Exclusao Auditada):** `OPP-20260829-cl2e` via `/reversa-restructure` - **CONCLUIDO (APPLIED)**
3. **Passo 3 (Otimizacao de Queries e Serializer):** `OPP-20260829-cl3o` via `/reversa-optimize` - **CONCLUIDO (APPLIED)**
4. **Passo 4 (Provisionamento Modular de Colaboradores):** `OPP-20260829-cl4u` via `/reversa-modularize` - **CONCLUIDO (APPLIED)**
5. **Passo 5 (Simplificacao de Validadores de Documentos):** `OPP-20260829-cl5v` via `/reversa-simplify` - **CONCLUIDO (APPLIED)**

---

## 3. Transformacoes Aplicadas

- [`OPP-20260829-cl1a-encapsulamento-aceite-cliente`](../transformations/OPP-20260829-cl1a-encapsulamento-aceite-cliente/transformation.md):
  - **Verbo:** `restructure`
  - **Ganhos:** Encapsulamento da lógica de validação de token, transição de status para ATIVO, verificação de e-mail e criação de notificações em método transacional atômico `ClienteService.formalizar_aceite`.
  - **Rede de Seguranca:** 15/15 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-cl1a-encapsulamento-aceite-cliente/CHG-001.diff)

- [`OPP-20260829-cl2e-exclusao-auditada-cliente`](../transformations/OPP-20260829-cl2e-exclusao-auditada-cliente/transformation.md):
  - **Verbo:** `restructure`
  - **Ganhos:** Encapsulamento da exclusão auditada com regras de integridade referencial (contratos e pedidos), gravação em `ClienteAuditLog` e disparo de notificações atômicas em `ClienteService.excluir_cliente`.
  - **Rede de Seguranca:** 15/15 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-cl2e-exclusao-auditada-cliente/CHG-001.diff)

- [`OPP-20260829-cl3o-otimizacao-queries-serializer`](../transformations/OPP-20260829-cl3o-otimizacao-queries-serializer/transformation.md):
  - **Verbo:** `optimize`
  - **Ganhos:** Redução de queries SQL de $O(N \times 7)$ para $O(1)$ aproveitando prefetch em memória e cache de instância em `ClienteSerializer`.
  - **Rede de Seguranca:** 15/15 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-cl3o-otimizacao-queries-serializer/CHG-001.diff)

- [`OPP-20260829-cl4u-provisionamento-colaboradores`](../transformations/OPP-20260829-cl4u-provisionamento-colaboradores/transformation.md):
  - **Verbo:** `modularize`
  - **Ganhos:** Modularização da geração de usuários, controle determinístico de unicidade de login, tokens Passwordless de 48 horas e reenvio de convites em `ClienteService`.
  - **Rede de Seguranca:** 15/15 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-cl4u-provisionamento-colaboradores/CHG-001.diff)

- [`OPP-20260829-cl5v-centralizacao-validadores`](../transformations/OPP-20260829-cl5v-centralizacao-validadores/transformation.md):
  - **Verbo:** `simplify`
  - **Ganhos:** Padronização da validação de dígitos verificadores de CPF e CNPJ diretamente no método `Cliente.clean()` do modelo Django.
  - **Rede de Seguranca:** 15/15 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-cl5v-centralizacao-validadores/CHG-001.diff)
