# Design do Módulo Saldo

## 1. Modelos
- `HistoricoSaldo`: id (UUID), contrato (FK), tipo_operacao, quantidade, saldo_resultante, autor, pedido, ciclo, ip_origem.
- `TransferenciaSaldo`: contrato_origem (FK), contrato_destino (FK), quantidade, motivo, autor.
- `Reabastecimento`: contrato (FK), quantidade, motivo, autor.
