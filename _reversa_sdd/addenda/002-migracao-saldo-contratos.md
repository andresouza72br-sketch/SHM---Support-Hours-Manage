# Adendo de Convergência SDD — Feature 002: Assistente de Migração e Aproveitamento de Saldo de Contratos Vencidos

> **Identificador:** `002-migracao-saldo-contratos`  
> **Data:** `2026-08-27`  
> **Cenário:** `legado`  

## Vigência

Vigente desde 2026-08-27.
Superado pela re-extração de 2026-08-30.

## 1. Resumo da Entrega

Implementado o Assistente de Migração e Aproveitamento de Saldo de Contratos Vencidos para possibilitar a transferência rápida e assistida de saldos remanescentes de contratos expirados ou concluídos para novos contratos vigentes do mesmo cliente, com suporte a migração total (100%) ou parcial, bloqueio transacional pessimista (`select_for_update`) e auditoria forense dupla em `ContratoAuditLog` e `HistoricoSaldo`.

Total de 6 ações concluídas com sucesso (T001 a T006).

## 2. Impacto por Artefato da Extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/architecture.md` | `apps.saldo` | `componente-novo` | Endpoint REST `/api/v1/saldo/contratos_elegiveis/` e `/api/v1/saldo/migrar/` adicionados para gestão assistida de saldo de contratos. |
| `_reversa_sdd/domain.md` | `RN-03` | `regra-alterada` | Contratos expirados/concluídos com saldo positivo agora podem ter seu saldo remanescente aproveitado em novos contratos do mesmo cliente. |
| `_reversa_sdd/domain.md` | `RN-05` | `regra-alterada` | Transferência de saldo ganha método especializado no `SaldoService` com auditoria contratual automática. |
| `_reversa_sdd/frontend/` | `contratos` | `componente-novo` | Modal `MigracaoSaldoModal.tsx` integrado no detalhe e na listagem de contratos. |

## 3. Regras sob Vigilância

- `W001`: Isolamento por cliente: transferências entre clientes distintos estritamente bloqueadas.
- `W002`: Integridade ACID do ledger com duplo lançamento no `HistoricoSaldo`.
- `W003`: Auditoria obrigatória em `ContratoAuditLog` para origem e destino.

## 4. Fontes

- `_reversa_forward/002-migracao-saldo-contratos/requirements.md`
- `_reversa_forward/002-migracao-saldo-contratos/roadmap.md`
- `_reversa_forward/002-migracao-saldo-contratos/legacy-impact.md`
- `_reversa_forward/002-migracao-saldo-contratos/regression-watch.md`
- `_reversa_forward/002-migracao-saldo-contratos/actions.md`
