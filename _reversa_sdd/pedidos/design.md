# Design do Módulo Pedidos

## 1. Modelos
- `Pedido`: protocolo, cliente (FK), contrato (FK), assunto, descricao, prioridade, status, criado_por (FK).
- `AnexoPedido`: pedido (FK), arquivo, nome_original, tamanho.

## 2. Serviços
- `PedidoService.gerar_protocolo()`: Gera protocolo sequencial diário/mensal.
- `PedidoService.sincronizar_status_pedido()`: Avalia status dos ciclos e atualiza status do pedido.
