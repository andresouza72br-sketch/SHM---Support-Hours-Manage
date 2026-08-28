# ADR 002: Ledger Imutável Append-Only para Movimentações de Saldo

## Status
Aprovado / Implementado

## Contexto
O controle de saldo de contratos exige auditoria financeira rigorosa e proteção contra adulterações acidentais ou intencionais em bancos de dados.

## Decisão
Implementar a entidade `HistoricoSaldo` como um ledger append-only e imutável. Toda alteração de saldo exige transação com bloqueio pessimista (`select_for_update`) e gera um registro com saldo resultante, tipo de operação, carimbo temporal, IP de origem e autor.

## Consequências
- **Positivas:** Conformidade total para auditorias fiscais e contratuais; impossibilidade de saldo inconsistente sem registro rastreável.