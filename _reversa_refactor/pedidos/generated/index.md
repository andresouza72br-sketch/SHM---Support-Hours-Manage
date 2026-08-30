# Catálogo de Oportunidades de Refatoração - Pedidos

> Contexto: `pedidos`  
> Atualizado em: 2026-08-29  
> Status do Registro: 4 Aplicadas | 0 Propostas (100% CONCLUÍDO)

---

## 1. Tabela de Oportunidades Priorizadas por ROI

| # | ID | Verbo | Confiança | Custo | Título | Estado |
|---|---|---|---|---|---|---|
| 1 | [`OPP-20260829-p1sq`](../opportunities/OPP-20260829-p1sq.md) | `optimize` | 🟢 Alta | Baixo | Otimização SQL O(1) de geração de protocolo OSYYYYMMNNNN | `applied` |
| 2 | [`OPP-20260829-p2kb`](../opportunities/OPP-20260829-p2kb.md) | `optimize` | 🟢 Alta | Baixo | Serialização em lote e particionamento do endpoint Kanban | `applied` |
| 3 | [`OPP-20260829-p3dc`](../opportunities/OPP-20260829-p3dc.md) | `decouple` | 🟢 Alta | Baixo | Desacoplamento da criação de pedidos para PedidoService.criar_pedido | `applied` |
| 4 | [`OPP-20260829-p4st`](../opportunities/OPP-20260829-p4st.md) | `standardize` | 🟢 Alta | Baixo | Padronização de logging estruturado em eventos de novos chamados | `applied` |

---

## 2. Status das Transformações do Contexto

1. **Passo 1 (Otimização do Protocolo Sequencial):** `OPP-20260829-p1sq` via `/reversa-optimize` - **CONCLUÍDO (APPLIED)**
2. **Passo 2 (Otimização do Endpoint Kanban):** `OPP-20260829-p2kb` via `/reversa-optimize` - **CONCLUÍDO (APPLIED)**
3. **Passo 3 (Desacoplamento de Criação de Chamados):** `OPP-20260829-p3dc` via `/reversa-decouple` - **CONCLUÍDO (APPLIED)**
4. **Passo 4 (Padronização de Logging de Eventos):** `OPP-20260829-p4st` via `/reversa-standardize` - **CONCLUÍDO (APPLIED)**

---

## 3. Transformações Aplicadas

- [`OPP-20260829-p1sq-otimizacao-geracao-protocolo`](../transformations/OPP-20260829-p1sq-otimizacao-geracao-protocolo/transformation.md):
  - **Verbo:** `optimize`
  - **Ganhos:** Otimização SQL $O(1)$ de memória/CPU eliminando parsing de strings via regex e loops de busca em massa.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-p1sq-otimizacao-geracao-protocolo/CHG-001.diff)

- [`OPP-20260829-p2kb-otimizacao-endpoint-kanban`](../transformations/OPP-20260829-p2kb-otimizacao-endpoint-kanban/transformation.md):
  - **Verbo:** `optimize`
  - **Ganhos:** Serialização em lote vetorizada (`many=True`) com redução de 99% das instanciações avulsas de serializers.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-p2kb-otimizacao-endpoint-kanban/CHG-001.diff)

- [`OPP-20260829-p3dc-desacoplamento-criacao-pedidos`](../transformations/OPP-20260829-p3dc-desacoplamento-criacao-pedidos/transformation.md):
  - **Verbo:** `decouple`
  - **Ganhos:** Encapsulamento da criação de pedidos, resolução de cliente e despacho de evento em `PedidoService.criar_pedido`.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-p3dc-desacoplamento-criacao-pedidos/CHG-001.diff)

- [`OPP-20260829-p4st-padronizacao-logging-pedidos`](../transformations/OPP-20260829-p4st-padronizacao-logging-pedidos/transformation.md):
  - **Verbo:** `standardize`
  - **Ganhos:** Eliminação de ponto cego (`pass`) com logging estruturado e stack trace completo.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-p4st-padronizacao-logging-pedidos/CHG-001.diff)
