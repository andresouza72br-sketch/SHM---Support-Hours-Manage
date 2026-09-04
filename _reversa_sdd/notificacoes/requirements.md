# Requisitos do Módulo Notificações

> Gerado pelo **Reversa Writer** em 2026-09-04  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Sistema multicanal de eventos e notificações do SHM, englobando timeline de auditoria, notificações in-app, central declarativa de regras de despacho por categoria e papel RBAC, além de governança estrita de supressão de auto-notificações para o autor da ação.

## 2. Requisitos Funcionais
- **RF-NOT-01 (Must):** Gravação cronológica imutável de eventos na timeline (`TimelineEvent`) para pedidos e ciclos 🟢.
- **RF-NOT-02 (Must):** Envio de notificações in-app (`Notification`) com controle de leitura (`lida`) para usuários autenticados 🟢.
- **RF-NOT-03 (Must):** Central declarativa de regras (`ConfiguracaoNotificacao`) cobrindo 6 categorias: Autenticação, Clientes, Contratos, Saldo, Pedidos e Ciclos 🟢.
- **RF-NOT-04 (Must):** Toggles independentes por evento para canais (E-mail e In-App) e matriz de papéis (`empresa_admin`, `empresa_tecnico`, `cliente_gerente`, `cliente_comum`, `gestor_contrato`, `emails_cc`) 🟢.
- **RF-NOT-05 (Should):** Suporte a lista de e-mails fixos adicionais em JSON (`emails_adicionais`) por regra de evento 🟢.
- **RF-NOT-06 (Must):** Invariante Universal In-App — O autor da ação conectado é sistematicamente descartado de `destinatarios_in_app` (`destinatarios.discard(autor)`), de modo que o sininho in-app nunca exibe auto-notificações 🟢.
- **RF-NOT-07 (Must):** Supressão Seletiva de E-mail para o Autor — Campo booleano `nao_enviar_autor` no modelo `ConfiguracaoNotificacao`, com calibração ativa por padrão para os 14 eventos operacionais e inativa para os 8 eventos de convites/relatórios 🟢.
- **RF-NOT-08 (Must):** Expurgar o autor da ação de `destinatarios_usuarios` e eliminar seu e-mail da lista de cópias (`emails_cc`) com correspondência case-insensitive quando `nao_enviar_autor == True` 🟢.
- **RF-NOT-09 (Should):** Controle visual interativo via checkbox "Não enviar para o autor (Quem executou a ação)" no modal de Matriz de Destinatários em `ConfiguracoesNotificacoesPage.tsx` e serialização via DRF PATCH 🟢.
