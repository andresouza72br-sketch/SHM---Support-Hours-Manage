# Fluxograma do Módulo Saldo (Ledger Imutável)

```mermaid
flowchart TD
    A[Evento de Movimentação de Saldo] --> B{Tipo de Operação}
    B -->|Aceite de Ciclo| C[Consumo: Quantidade Negativa]
    B -->|Transferência| D[Debita Contrato Origem e Credita Contrato Destino]
    B -->|Reabastecimento| E[Credita Contrato com Horas Compradas]
    C --> F[Contrato.select_for_update()]
    D --> F
    E --> F
    F --> G[Atualiza contrato.saldo]
    G --> H[Cria Registro Imutável em HistoricoSaldo com IP e Autor]
```
