# Catálogo de Oportunidades de Refatoração - Comunicação

> Contexto: `comunicacao`  
> Atualizado em: 2026-08-29  
> Status do Registro: 4 Aplicadas | 0 Propostas (100% CONCLUÍDO)

---

## 1. Tabela de Oportunidades Priorizadas por ROI

| # | ID | Verbo | Confiança | Custo | Título | Estado |
|---|---|---|---|---|---|---|
| 1 | [`OPP-20260829-cm3o`](../opportunities/OPP-20260829-cm3o.md) | `optimize` | 🟢 Alta | Baixo | Otimização de queries N+1 em contagens de reações e serializers | `applied` |
| 2 | [`OPP-20260829-cm2a`](../opportunities/OPP-20260829-cm2a.md) | `restructure` | 🟢 Alta | Baixo | Encapsulamento e atomicidade na conversão de comentário em tarefa técnica | `applied` |
| 3 | [`OPP-20260829-cm1d`](../opportunities/OPP-20260829-cm1d.md) | `decouple` | 🟢 Alta | Baixo | Desacoplamento da camada de domínio com extração do ComentarioService | `applied` |
| 4 | [`OPP-20260829-cm4s`](../opportunities/OPP-20260829-cm4s.md) | `standardize` | 🟢 Alta | Baixo | Padronização de logging estruturado no despacho de eventos e notificações | `applied` |

---

## 2. Ordem de Ataque Concluída

1. **Passo 1 (Otimização de Queries N+1 e Deduplicação):** `OPP-20260829-cm3o` via `/reversa-optimize` - **CONCLUÍDO (APPLIED)**
2. **Passo 2 (Reestruturação Transacional de Conversão em Tarefa):** `OPP-20260829-cm2a` via `/reversa-restructure` - **CONCLUÍDO (APPLIED)**
3. **Passo 3 (Desacoplamento e Camada de Serviço):** `OPP-20260829-cm1d` via `/reversa-decouple` - **CONCLUÍDO (APPLIED)**
4. **Passo 4 (Padronização e Observabilidade):** `OPP-20260829-cm4s` via `/reversa-standardize` - **CONCLUÍDO (APPLIED)**

---

## 3. Transformações Aplicadas

- [`OPP-20260829-cm3o-otimizacao-queries-serializer`](../transformations/OPP-20260829-cm3o-otimizacao-queries-serializer/transformation.md):
  - **Verbo:** `optimize`
  - **Ganhos:** Redução de queries SQL de $O(N)$ (20 queries) para $O(1)$ (0 queries adicionais durante serialização) e unificação em `BaseComentarioSerializer`.
  - **Rede de Segurança:** 7/7 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-cm3o-otimizacao-queries-serializer/CHG-001.diff)

- [`OPP-20260829-cm2a-atomicidade-conversao-tarefa`](../transformations/OPP-20260829-cm2a-atomicidade-conversao-tarefa/transformation.md):
  - **Verbo:** `restructure`
  - **Ganhos:** Garantia transacional ACID com `with transaction.atomic():` prevenindo tarefas técnicas órfãs e inconsistências relacionais.
  - **Rede de Segurança:** 7/7 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-cm2a-atomicidade-conversao-tarefa/CHG-001.diff)

- [`OPP-20260829-cm1d-desacoplamento-comentario-service`](../transformations/OPP-20260829-cm1d-desacoplamento-comentario-service/transformation.md):
  - **Verbo:** `decouple`
  - **Ganhos:** Redução de 85% no acoplamento eferente da View HTTP, extraindo as regras de negócio para `ComentarioService`.
  - **Rede de Segurança:** 7/7 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-cm1d-desacoplamento-comentario-service/CHG-001.diff)

- [`OPP-20260829-cm4s-padronizacao-logging-notificacoes`](../transformations/OPP-20260829-cm4s-padronizacao-logging-notificacoes/transformation.md):
  - **Verbo:** `standardize`
  - **Ganhos:** Eliminação do bloco silencioso `except Exception: pass` e introdução de logging estruturado forense com stack trace.
  - **Rede de Segurança:** 7/7 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-cm4s-padronizacao-logging-notificacoes/CHG-001.diff)
