# Requisitos do Módulo Notificações

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO & HOMOLOGADO

## 1. Visão Geral
Timeline cronológica de eventos de auditoria de pedidos e ciclos, notificações in-app e disparo de e-mails transacionais (com roadmap multicanal para WhatsApp e Telegram).

## 2. Requisitos Funcionais
- **RF-NOT-01 (Must):** Gravar `TimelineEvent` a cada transição de status de pedido e ciclo 🟢.
- **RF-NOT-02 (Must):** Criar `Notification` in-app para os usuários afetados 🟢.
- **RF-NOT-03 (Must):** Disparar e-mails HTML transacionais com links diretos e Magic Links para aprovações 🟢.
- **RF-NOT-04 (Roadmap / Futuro):** Suportar envio de notificações e links de aprovação rápida via **WhatsApp Business API** e **Telegram Bot API** 🟡.

## 3. Critérios de Aceitação
```gherkin
Cenário: Notificação transacional por e-mail no envio de orçamento
  Dado que o técnico apresenta orçamento de um ciclo
  Quando a transição de status é processada
  Então o sistema grava um evento na Timeline, gera notificação in-app e dispara e-mail com o Magic Link de aprovação.
```
