# Catálogo de Oportunidades de Refatoração - Saldo

> Contexto: `saldo`  
> Atualizado em: 2026-08-29  
> Status do Registro: 5 Aplicadas | 0 Propostas (Ciclo de Refatoração 100% Concluído)

---

## 1. Tabela de Oportunidades Executadas por ROI

| # | ID | Verbo | Confiança | Custo | Título | Estado |
|---|---|---|---|---|---|---|
| 1 | [`OPP-20260828-d3lk`](../opportunities/OPP-20260828-d3lk.md) | `optimize` | 🟢 Alta | Baixo | Ordenação determinística de locks select_for_update para prevenção de deadlock | `applied` |
| 2 | [`OPP-20260828-r7nm`](../opportunities/OPP-20260828-r7nm.md) | `restructure` | 🟢 Alta | Baixo | Unificação do pipeline de transferências e extração de primitivas atômicas do ledger | `applied` |
| 3 | [`OPP-20260828-s4fg`](../opportunities/OPP-20260828-s4fg.md) | `simplify` | 🟢 Alta | Baixo | Substituição de blocos except Exception pass silenciosos por logging estruturado | `applied` |
| 4 | [`OPP-20260828-e2qx`](../opportunities/OPP-20260828-e2qx.md) | `restructure` | 🟢 Alta | Baixo | Extração de regras de filtro de contratos elegíveis e devedores para ContratoQuerySet | `applied` |
| 5 | [`OPP-20260828-m8pc`](../opportunities/OPP-20260828-m8pc.md) | `decouple` | 🟢 Alta | Médio | Desacoplamento de efeitos colaterais de auditoria, e-mail e notificações in-app | `applied` |

---

## 2. Ordem de Ataque Executada

1. **Passo 1 (Otimização de Concorrência):** `OPP-20260828-d3lk` via `/reversa-optimize` - **CONCLUÍDO (APPLIED)**
2. **Passo 2 (Reestruturação do Core Contábil):** `OPP-20260828-r7nm` via `/reversa-restructure` - **CONCLUÍDO (APPLIED)**
3. **Passo 3 (Simplificação e Observabilidade):** `OPP-20260828-s4fg` via `/reversa-simplify` - **CONCLUÍDO (APPLIED)**
4. **Passo 4 (Reestruturação de Consultas DRF):** `OPP-20260828-e2qx` via `/reversa-restructure` - **CONCLUÍDO (APPLIED)**
5. **Passo 5 (Desacoplamento de Mensageria):** `OPP-20260828-m8pc` via `/reversa-decouple` - **CONCLUÍDO (APPLIED)**

---

## 3. Sumário das Transformações Aplicadas

- [`OPP-20260828-d3lk-ordenacao-locks-select-for-update`](../transformations/OPP-20260828-d3lk-ordenacao-locks-select-for-update/transformation.md):
  - **Verbo:** `optimize`
  - **Ganhos:** Prevenção de deadlocks relacionais (100%) e redução de 50% nas consultas SQL de lock.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260828-d3lk-ordenacao-locks-select-for-update/CHG-001.diff)

- [`OPP-20260828-r7nm-unificacao-pipeline-transferencias`](../transformations/OPP-20260828-r7nm-unificacao-pipeline-transferencias/transformation.md):
  - **Verbo:** `restructure`
  - **Ganhos:** Eliminação de 95 linhas duplicadas e garantia de ponto único atômico para mutações no ledger contábil.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260828-r7nm-unificacao-pipeline-transferencias/CHG-001.diff)

- [`OPP-20260828-s4fg-substituicao-except-pass-logging`](../transformations/OPP-20260828-s4fg-substituicao-except-pass-logging/transformation.md):
  - **Verbo:** `simplify`
  - **Ganhos:** Eliminação de 4 blocos de silenciamento cego e introdução de logging com stacktrace sem comprometer a transação financeira.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260828-s4fg-substituicao-except-pass-logging/CHG-001.diff)

- [`OPP-20260828-e2qx-extracao-contrato-queryset`](../transformations/OPP-20260828-e2qx-extracao-contrato-queryset/transformation.md):
  - **Verbo:** `restructure`
  - **Ganhos:** Encapsulamento de consultas de domínio em `ContratoQuerySet` e limpeza das Views DRF.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260828-e2qx-extracao-contrato-queryset/CHG-001.diff)

- [`OPP-20260828-m8pc-desacoplamento-mensageria-auditoria`](../transformations/OPP-20260828-m8pc-desacoplamento-mensageria-auditoria/transformation.md):
  - **Verbo:** `decouple`
  - **Ganhos:** Redução de 83% no acoplamento eferente do SaldoService, eliminação de 4 blocos de import dinâmico e isolamento contábil estrito.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260828-m8pc-desacoplamento-mensageria-auditoria/CHG-001.diff)
