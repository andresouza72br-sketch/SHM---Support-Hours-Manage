# Catálogo de Oportunidades de Refatoração - Contratos

> Contexto: `contratos`  
> Atualizado em: 2026-08-29  
> Status do Registro: 4 Aplicadas | 0 Propostas (100% Concluído)

---

## 1. Tabela de Oportunidades Priorizadas por ROI

| # | ID | Verbo | Confiança | Custo | Título | Estado |
|---|---|---|---|---|---|---|
| 1 | [`OPP-20260829-c1ac`](../opportunities/OPP-20260829-c1ac.md) | `restructure` | 🟢 Alta | Baixo | Encapsulamento e atomicidade da formalização de aceite em ContratoService.formalizar_aceite | `applied` |
| 2 | [`OPP-20260829-c2sq`](../opportunities/OPP-20260829-c2sq.md) | `optimize` | 🟢 Alta | Baixo | Otimização da geração de números sequenciais eliminando varredura em memória | `applied` |
| 3 | [`OPP-20260829-c3ex`](../opportunities/OPP-20260829-c3ex.md) | `simplify` | 🟢 Alta | Baixo | Extração do cálculo de conciliação financeira do extrato da View para o Service | `applied` |
| 4 | [`OPP-20260829-c4dc`](../opportunities/OPP-20260829-c4dc.md) | `decouple` | 🟢 Alta | Baixo | Encapsulamento de integridade e auditoria de documentos anexos em ContratoDocumentoService | `applied` |

---

## 2. Ordem de Ataque Concluída

1. **Passo 1 (Core Transacional do Aceite):** `OPP-20260829-c1ac` via `/reversa-restructure` - **CONCLUÍDO (APPLIED)**
2. **Passo 2 (Otimização de Geração de Sequencial):** `OPP-20260829-c2sq` via `/reversa-optimize` - **CONCLUÍDO (APPLIED)**
3. **Passo 3 (Simplificação de Extrato & Conciliação):** `OPP-20260829-c3ex` via `/reversa-simplify` - **CONCLUÍDO (APPLIED)**
4. **Passo 4 (Desacoplamento de Documentos & Storage):** `OPP-20260829-c4dc` via `/reversa-decouple` - **CONCLUÍDO (APPLIED)**

---

## 3. Transformações Aplicadas

- [`OPP-20260829-c1ac-encapsulamento-aceite-contrato`](../transformations/OPP-20260829-c1ac-encapsulamento-aceite-contrato/transformation.md):
  - **Verbo:** `restructure`
  - **Ganhos:** Encapsulamento de 89 linhas da View HTTP em método de serviço `ContratoService.formalizar_aceite` com garantia de transação atômica `@transaction.atomic`.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-c1ac-encapsulamento-aceite-contrato/CHG-001.diff)

- [`OPP-20260829-c2sq-otimizacao-gerador-numero`](../transformations/OPP-20260829-c2sq-otimizacao-gerador-numero/transformation.md):
  - **Verbo:** `optimize`
  - **Ganhos:** Otimização para $O(1)$ de memória e tempo com busca indexada (`LIMIT 1`).
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-c2sq-otimizacao-gerador-numero/CHG-001.diff)

- [`OPP-20260829-c3ex-extracao-conciliacao-extrato`](../transformations/OPP-20260829-c3ex-extracao-conciliacao-extrato/transformation.md):
  - **Verbo:** `simplify`
  - **Ganhos:** Extração de agregações financeiras e apuração de ciclos para `ContratoService.obter_dados_extrato`.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-c3ex-extracao-conciliacao-extrato/CHG-001.diff)

- [`OPP-20260829-c4dc-encapsulamento-contrato-documentos`](../transformations/OPP-20260829-c4dc-encapsulamento-contrato-documentos/transformation.md):
  - **Verbo:** `decouple`
  - **Ganhos:** Desacoplamento da View de storage físico e cálculos de hash com a classe `ContratoDocumentoService`.
  - **Rede de Segurança:** 73/73 testes aprovados (100% verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-c4dc-encapsulamento-contrato-documentos/CHG-001.diff)
