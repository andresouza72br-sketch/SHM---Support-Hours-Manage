# Design do Módulo Notificações

## 1. Modelos
- `TimelineEvent`: pedido (FK), ciclo (FK), tipo, descricao, autor (FK), timestamp.
- `Notification`: usuario (FK), titulo, mensagem, url, lida.
