# Legacy Impact: Assistente de Migração e Aproveitamento de Saldo de Contratos Vencidos

> Feature: `002-migracao-saldo-contratos`
> Data: `2026-08-27`
> Cenário: `legado`

## 1. Componentes Afetados

| Componente | Arquivo no Legado | Tipo de Mudança | Resumo |
|---|---|---|---|
| `SaldoService` | `backend/apps/saldo/services.py` | regra-nova | Inclusão do método `migrar_saldo_contratos_vencidos` com transação ACID, verificação de cliente e auditoria contratual. |
| `SaldoViewSet` | `backend/apps/saldo/views.py` | contrato-novo | Adicionadas actions `@action contratos_elegiveis` (GET) e `@action migrar` (POST) restritas a `IsEmpresaAdmin`. |
| `clientService.saldo` | `frontend/src/api/client.ts` | contrato-novo | Adicionadas chamadas REST para consulta de contratos elegíveis e execução de migração. |
| `MigracaoSaldoModal` | `frontend/src/components/contratos/MigracaoSaldoModal.tsx` | componente-novo | Componente modal interativo com seleção de contratos de origem, cálculo automático de percentuais e feedback visual de projeção de saldos. |
| `ContratosPage` & `ExtratoContratoPage` | `frontend/src/pages/` | regra-alterada | Integrado botão de ação "Aproveitar Saldo" e modal assistente para administradores da empresa. |

## 2. Regras de Domínio Impactadas

| Regra | Origem | Impacto |
|---|---|---|
| RN-03 | `_reversa_sdd/domain.md#RN-03` | Saldo remanescente de contratos expirados agora pode ser transferido assistidamente para contratos ativos/novos do mesmo cliente. |
| RN-05 | `_reversa_sdd/domain.md#RN-05` | Transferência entre contratos ganha auditoria dedicada em `ContratoAuditLog` e descrições especializadas no ledger `HistoricoSaldo`. |
