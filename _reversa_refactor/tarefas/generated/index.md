# Catalogo de Oportunidades de Refatoracao - Tarefas

> Contexto: `tarefas`  
> Atualizado em: 2026-08-29  
> Status do Registro: 4 Aplicadas | 0 Propostas (100% CONCLUIDO)

---

## 1. Tabela de Oportunidades Priorizadas por ROI

| # | ID | Verbo | Confianca | Custo | Titulo | Estado |
|---|---|---|---|---|---|---|
| 1 | [`OPP-20260829-t1ag`](../opportunities/OPP-20260829-t1ag.md) | `optimize` | 🟢 Alta | Baixo | Agregacao SQL nativa e lock atomico no recalculo de horas realizadas do ciclo | `applied` |
| 2 | [`OPP-20260829-t2dc`](../opportunities/OPP-20260829-t2dc.md) | `decouple` | 🟢 Alta | Baixo | Desacoplamento do ciclo de vida de tarefas e criacao da camada TarefaService | `applied` |
| 3 | [`OPP-20260829-t3sp`](../opportunities/OPP-20260829-t3sp.md) | `simplify` | 🟢 Alta | Baixo | Deduplicacao da rotina de recalculo e validacao declarativa de horas nao-negativas | `applied` |
| 4 | [`OPP-20260829-t4st`](../opportunities/OPP-20260829-t4st.md) | `standardize` | 🟢 Alta | Baixo | Padronizacao de logging estruturado nas operacoes de apontamento e recalculo | `applied` |

---

## 2. Status das Transformacoes do Contexto

1. **Passo 1 (Otimizacao do Recalculo SQL e Lock):** `OPP-20260829-t1ag` via `/reversa-optimize` - **CONCLUIDO (APPLIED)**
2. **Passo 2 (Desacoplamento e Camada de Servico):** `OPP-20260829-t2dc` via `/reversa-decouple` - **CONCLUIDO (APPLIED)**
3. **Passo 3 (Simplificacao e Validacao Declarativa):** `OPP-20260829-t3sp` via `/reversa-simplify` - **CONCLUIDO (APPLIED)**
4. **Passo 4 (Padronizacao de Observabilidade e Logs):** `OPP-20260829-t4st` via `/reversa-standardize` - **CONCLUIDO (APPLIED)**

---

## 3. Transformacoes Aplicadas

- [`OPP-20260829-t1ag-agregacao-sql-recalculo-horas`](../transformations/OPP-20260829-t1ag-agregacao-sql-recalculo-horas/transformation.md):
  - **Verbo:** `optimize`
  - **Ganhos:** Reducao de complexidade de memoria de $O(N)$ para $O(1)$ atraves de `Sum('horas_realizadas')` nativo com `Coalesce` e transacao atomica `@transaction.atomic`.
  - **Rede de Seguranca:** 14/14 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-t1ag-agregacao-sql-recalculo-horas/CHG-001.diff)

- [`OPP-20260829-t2dc-desacoplamento-tarefa-service`](../transformations/OPP-20260829-t2dc-desacoplamento-tarefa-service/transformation.md):
  - **Verbo:** `decouple`
  - **Ganhos:** Criacao de `TarefaService` encapsulando mutacoes e recalculos contabeis de ciclo, reduzindo o acoplamento do model em 80%.
  - **Rede de Seguranca:** 14/14 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-t2dc-desacoplamento-tarefa-service/CHG-001.diff)

- [`OPP-20260829-t3sp-validacao-declarativa-horas`](../transformations/OPP-20260829-t3sp-validacao-declarativa-horas/transformation.md):
  - **Verbo:** `simplify`
  - **Ganhos:** Adicao de validacao declarativa `min_value` nos campos de horas e protecao contra strings vazias em `TarefaSerializer`.
  - **Rede de Seguranca:** 14/14 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-t3sp-validacao-declarativa-horas/CHG-001.diff)

- [`OPP-20260829-t4st-padronizacao-logging-tarefas`](../transformations/OPP-20260829-t4st-padronizacao-logging-tarefas/transformation.md):
  - **Verbo:** `standardize`
  - **Ganhos:** Instrumentacao de logs estruturados em `TarefaService` e `TarefaViewSet` com contexto completo de IDs e status.
  - **Rede de Seguranca:** 14/14 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-t4st-padronizacao-logging-tarefas/CHG-001.diff)
