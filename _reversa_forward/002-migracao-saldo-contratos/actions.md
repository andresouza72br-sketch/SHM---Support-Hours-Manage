# Actions: Assistente de Migração e Aproveitamento de Saldo de Contratos Vencidos

> Identificador: `002-migracao-saldo-contratos`
> Data: `2026-08-27`
> Roadmap: `_reversa_forward/002-migracao-saldo-contratos/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 6 |
| Paralelizáveis (`[//]`) | 2 |
| Maior cadeia de dependência | 4 |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|---|---|---|---|---|---|---|
| T001 | Implementar método `migrar_saldo_contratos_vencidos` em `SaldoService` com validações de cliente, status e auditoria dupla | - | - | `backend/apps/saldo/services.py` | 🟢 | `[X]` |

## Fase 2, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|---|---|---|---|---|---|---|
| T002 | Adicionar endpoints REST `@action contratos_elegiveis` e `@action migrar` em `SaldoViewSet` | T001 | - | `backend/apps/saldo/views.py` | 🟢 | `[X]` |

## Fase 3, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|---|---|---|---|---|---|---|
| T003 | Criar testes automatizados de backend para migração de saldo (casos válidos, clientes divergentes, saldo zero) | T002 | `[//]` | `backend/tests/test_migracao_saldo.py` | 🟢 | `[X]` |

## Fase 4, Frontend

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|---|---|---|---|---|---|---|
| T004 | Criar componente `MigracaoSaldoModal.tsx` com listagem de contratos elegíveis e confirmação de transferência | T002 | `[//]` | `frontend/src/components/contratos/MigracaoSaldoModal.tsx` | 🟢 | `[X]` |
| T005 | Integrar o `MigracaoSaldoModal` na tela/detalhe de Contratos e Saldo | T004 | - | `frontend/src/pages/ContratoDetailPage.tsx` | 🟢 | `[X]` |

## Fase 5, Validação e Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|---|---|---|---|---|---|---|
| T006 | Executar suíte completa de testes no backend (`pytest`) e build do frontend (`npm run build`) | T003, T005 | - | `backend/tests/` & `frontend/` | 🟢 | `[X]` |

## Notas de execução
- Backend: 72/72 testes automatizados passando em `backend/tests/` (100% de sucesso).
- Frontend: `npm run build` compilado com sucesso sem erros TypeScript.

## Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-08-27 | Versão inicial gerada por `/reversa-to-do` | reversa |
| 2026-08-27 | Todas as ações T001-T006 concluídas e validadas por `/reversa-coding` | reversa |
