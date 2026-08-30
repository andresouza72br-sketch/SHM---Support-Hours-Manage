# Catalogo de Oportunidades de Refatoracao - Notificacoes

> Contexto: `notificacoes`  
> Atualizado em: 2026-08-29  
> Status do Registro: 4 Aplicadas | 0 Propostas (100% Concluido)

---

## 1. Tabela de Oportunidades Priorizadas por ROI

| # | ID | Verbo | Confianca | Custo | Titulo | Estado |
|---|---|---|---|---|---|---|
| 1 | [`OPP-20260829-nt4p`](../opportunities/OPP-20260829-nt4p.md) | `standardize` | 🟢 Alta | Baixo | Normalização de logging com logger padrão, remoção de prints, tratamento auditável de exceções e adequação PEP 8 de imports | `applied` |
| 2 | [`OPP-20260829-nt3s`](../opportunities/OPP-20260829-nt3s.md) | `simplify` | 🟢 Alta | Baixo | Unificação e reaproveitamento dos helpers de identificação de autor, origem e resolução de destinatários | `applied` |
| 3 | [`OPP-20260829-nt2d`](../opportunities/OPP-20260829-nt2d.md) | `modularize` | 🟢 Alta | Baixo | Extração do template visual HTML de e-mail transacional para componente dedicado de renderização | `applied` |
| 4 | [`OPP-20260829-nt1m`](../opportunities/OPP-20260829-nt1m.md) | `restructure` | 🟢 Alta | Baixo | Decomposição e encapsulamento dos formatadores de evento e governança de destinatários em NotificacaoService | `applied` |

---

## 2. Ordem de Ataque Concluida

1. **Passo 1 (Padronização e Observabilidade):** `OPP-20260829-nt4p` via `/reversa-standardize` - **CONCLUÍDO (APPLIED)**
2. **Passo 2 (Simplificação de Helpers de Domínio):** `OPP-20260829-nt3s` via `/reversa-simplify` - **CONCLUÍDO (APPLIED)**
3. **Passo 3 (Modularização do Layout Visual HTML):** `OPP-20260829-nt2d` via `/reversa-modularize` - **CONCLUÍDO (APPLIED)**
4. **Passo 4 (Reestruturação do Orquestrador de Ciclo de Vida):** `OPP-20260829-nt1m` via `/reversa-restructure` - **CONCLUÍDO (APPLIED)**

---

## 3. Transformações Aplicadas

- [`OPP-20260829-nt4p-padronizacao-logging-imports`](../transformations/OPP-20260829-nt4p-padronizacao-logging-imports/transformation.md):
  - **Verbo:** `standardize`
  - **Ganhos:** Instrumentação de `logging.getLogger(__name__)`, eliminação de `print()`, tratamento com `logger.warning` em falhas de gravação da timeline e centralização de imports PEP 8 no cabeçalho.
  - **Rede de Segurança:** 100% dos testes aprovados (verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-nt4p-padronizacao-logging-imports/CHG-001.diff)

- [`OPP-20260829-nt3s-simplificacao-helpers-destinatarios`](../transformations/OPP-20260829-nt3s-simplificacao-helpers-destinatarios/transformation.md):
  - **Verbo:** `simplify`
  - **Ganhos:** Centralização da resolução de autor/origem e busca de destinatários nos helpers `_obter_info_autor_e_origem` e `_obter_destinatarios_envolvidos`, eliminando ~55 linhas duplicadas.
  - **Rede de Segurança:** 100% dos testes aprovados (verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-nt3s-simplificacao-helpers-destinatarios/CHG-001.diff)

- [`OPP-20260829-nt2d-extracao-template-email`](../transformations/OPP-20260829-nt2d-extracao-template-email/transformation.md):
  - **Verbo:** `modularize`
  - **Ganhos:** Criação do módulo `email_templates.py` com `renderizar_email_transacional()`, isolando 50 linhas de layout visual e tags HTML/CSS de `services.py`.
  - **Rede de Segurança:** 100% dos testes aprovados (verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-nt2d-extracao-template-email/CHG-001.diff)

- [`OPP-20260829-nt1m-decomposicao-orquestrador-eventos`](../transformations/OPP-20260829-nt1m-decomposicao-orquestrador-eventos/transformation.md):
  - **Verbo:** `restructure`
  - **Ganhos:** Decomposição do orquestrador monolítico de 250 linhas em `_montar_payload_evento_ciclo` e `_obter_destinatarios_email_por_grupo`, reduzindo `notificar_evento_ciclo` para um fluxo linear de ~45 linhas.
  - **Rede de Segurança:** 100% dos testes aprovados (verde).
  - **Diff:** [`CHG-001.diff`](../transformations/OPP-20260829-nt1m-decomposicao-orquestrador-eventos/CHG-001.diff)
