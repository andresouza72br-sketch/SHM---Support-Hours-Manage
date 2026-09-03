# Requisitos do Módulo Notificações

> Gerado pelo **Reversa Writer** em 2026-09-03  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Sistema multicanal de eventos e notificações do SHM, englobando timeline de auditoria, notificações in-app e central declarativa de regras de despacho por categoria e papel RBAC.

## 2. Requisitos Funcionais
- **RF-NOT-01 (Must):** Gravação cronológica imutável de eventos na timeline (`TimelineEvent`) para pedidos e ciclos 🟢.
- **RF-NOT-02 (Must):** Envio de notificações in-app (`Notification`) com controle de leitura (`lida`) para usuários autenticados 🟢.
- **RF-NOT-03 (Must):** Central declarativa de regras (`ConfiguracaoNotificacao`) cobrindo 6 categorias: Autenticação, Clientes, Contratos, Saldo, Pedidos e Ciclos 🟢.
- **RF-NOT-04 (Must):** Toggles independentes por evento para canais (E-mail e In-App) e matriz de papéis (`empresa_admin`, `empresa_tecnico`, `cliente_gerente`, `cliente_comum`, `gestor_contrato`, `emails_cc`) 🟢.
- **RF-NOT-05 (Should):** Suporte a lista de e-mails fixos adicionais em JSON (`emails_adicionais`) por regra de evento 🟢.
