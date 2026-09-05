# Adendo de Convergência SDD — Feature 005: Trilha de Auditoria Forense com Hash Chaining e Harmonização de Mensagens

> **Identificador:** `005-auditoria-hash-chaining`  
> **Data:** `2026-09-04`  
> **Cenário:** `legado`  

## Vigência

Vigente desde 2026-09-04.
Superado pela re-extração de 2026-09-04.

## Resumo da entrega

Implementada a trilha unificada de auditoria forense com garantia matemática de imutabilidade baseada em encadeamento criptográfico particionado por contrato e eventos globais (*Hash Chaining*), bloqueio estrito contra alterações ou deleções no banco de dados e rotina de autoverificação de integridade da cadeia de registros. Adicionalmente, foi executada a harmonização integral dos eventos do sistema entre os quatro canais de comunicação e registro (alerta visual de interface, sininho interno, correio eletrônico transacional e laudo pericial), eliminando lacunas de rastreabilidade e prevenindo adulterações em registros financeiros de saldo e aceites contratuais.

Total de 17 ações atômicas concluídas com sucesso (T001 a T017) ao longo de 5 fases, com 135/135 testes passando no `pytest` (zero regressões no legado) e compilação do frontend validada sem erros no `npm run build`.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `apps.core` | `componente-novo` | Módulo `canonical_json.py` implementando serialização determinística RFC 8785 (ordenação de chaves UTF-8, formatação decimal `f"{val:.2f}"` e remoção de espaços) e cálculo de dispersão SHA-256. |
| `_reversa_sdd/architecture.md` | `apps.contratos` | `componente-novo` | Criação de `ForensicAuditService`, modelos `ForensicAuditLog` e `AuditDailySeal` com imutabilidade em duas camadas (gatilho PostgreSQL `trg_forensic_audit_immutable` e bloqueio ORM `save/delete`). |
| `_reversa_sdd/architecture.md` | `apps.contratos` | `delta-de-contrato-externo` | Novos endpoints periciais: `GET /api/v1/contratos/{id}/trilha_forense/`, `GET/POST /api/v1/contratos/{id}/verificar_integridade/` e painel consolidado `GET /api/v1/auditoria/painel_integridade/`. |
| `_reversa_sdd/architecture.md` | `apps.notificacoes` | `delta-de-dados` | Harmonização de `CONFIGURACOES_PADRAO` com inclusão de 7 códigos de eventos operacionais mapeados na matriz pente fino. |
| `_reversa_sdd/architecture.md` | `apps.saldo` | `regra-alterada` | Instrumentação forense transacional em `consumir` e `reabastecer` com lock pessimista por partição e gravação dupla reflexa. |
| `_reversa_sdd/domain.md` | `contratos` | `regra-nova` | **RN-10:** Encadeamento criptográfico SHA-256 particionado (`contrato:{id}`, `cliente:{id}`, `global`) com bloco gênese padronizado de 64 zeros hexadecimais. |
| `_reversa_sdd/domain.md` | `contratos` | `regra-nova` | **RN-11:** Imutabilidade estrita por bloqueio nativo no banco de dados (*append-only enforcement* via trigger e ORM, rejeitando UPDATE e DELETE). |
| `_reversa_sdd/domain.md` | `governanca` | `regra-nova` | **RN-12:** Justificativa mandatória estruturada (mínimo 10 caracteres válidos não-vazios) para todas as operações críticas de Nível 1 (`N1`). |
| `_reversa_sdd/domain.md` | `comunicacao` | `regra-nova` | **RN-13:** Matriz quádrupla de harmonização de eventos (interface, sininho interno, e-mail transacional e auditoria pericial). |
| `_reversa_sdd/domain.md` | `saldo` | `regra-alterada` | **RN-02:** Expansão da garantia de imutabilidade do livro-razão com dupla gravação reflexa em `ForensicAuditLog` em consumos, transferências, compensações e reabastecimentos. |
| `_reversa_sdd/domain.md` | `clientes` | `regra-alterada` | Exclusão definitiva de cliente exige justificativa N1 (mínimo 10 caracteres) e gera elo pericial indelével na partição `cliente:{id}` mesmo após o expurgo do registro relacional. |
| `_reversa_sdd/flowcharts/frontend.md` | `contratos` | `componente-alterado` | `TimelineAuditoriaContrato.tsx` com Selo Pericial em tempo real, verificação matemática da cadeia e alternador de elos criptográficos (`previous_hash` ➜ `current_hash`). |

## Regras sob vigilância

- `W001`: Determinismo RFC 8785 e Formatação Estrita de Decimais com duas casas (`backend/apps/core/canonical_json.py`). Ver `_reversa_forward/005-auditoria-hash-chaining/regression-watch.md`.
- `W002`: Transações ACID e Locks Pessimistas por Partição (`select_for_update()`) para evitar bifurcações da cadeia sob concorrência. Ver `_reversa_forward/005-auditoria-hash-chaining/regression-watch.md`.
- `W003`: Imutabilidade em Duas Camadas (Gatilho nativo PostgreSQL e interceptação ORM Django). Ver `_reversa_forward/005-auditoria-hash-chaining/regression-watch.md`.
- `W004`: Justificativa Mandatória N1 (Mínimo de 10 caracteres válidos não-vazios). Ver `_reversa_forward/005-auditoria-hash-chaining/regression-watch.md`.

## Fontes

- `_reversa_forward/005-auditoria-hash-chaining/requirements.md`
- `_reversa_forward/005-auditoria-hash-chaining/roadmap.md`
- `_reversa_forward/005-auditoria-hash-chaining/legacy-impact.md`
- `_reversa_forward/005-auditoria-hash-chaining/regression-watch.md`
- `_reversa_forward/005-auditoria-hash-chaining/actions.md`
- `_reversa_forward/005-auditoria-hash-chaining/progress.jsonl`