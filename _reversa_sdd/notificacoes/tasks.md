# Tarefas — Notificações

> Gerado pelo **Reversa Writer** em 2026-09-04  
> Confiança: 🟢 CONFIRMADO

- [x] **TASK-NOT-01:** Modelagem de `TimelineEvent` e `Notification` 🟢 (`backend/apps/notificacoes/models.py`).
- [x] **TASK-NOT-02:** Implementar `NotificacaoService` para registro de timeline e notificações in-app 🟢 (`backend/apps/notificacoes/services.py`).
- [x] **TASK-NOT-03:** Modelagem da entidade declarativa `ConfiguracaoNotificacao` com 6 categorias e matriz RBAC 🟢 (`backend/apps/notificacoes/models.py`).
- [x] **TASK-NOT-04:** Adicionar campo booleano `nao_enviar_autor` no modelo `ConfiguracaoNotificacao` via migração Django 🟢 (`backend/apps/notificacoes/migrations/0004_configuracaonotificacao_nao_enviar_autor.py`).
- [x] **TASK-NOT-05:** Implementar calibração de defaults dos 22 eventos do sistema e resolução com supressão de e-mail/CC 🟢 (`backend/apps/notificacoes/config_service.py`).
- [x] **TASK-NOT-06:** Aplicar salvaguarda estrita in-app universal (`destinatarios_in_app.discard(autor)`) no sininho 🟢 (`backend/apps/notificacoes/services.py`).
- [x] **TASK-NOT-07:** Expor `nao_enviar_autor` no serializer DRF e integrar controle reativo na interface administrativa 🟢 (`backend/apps/notificacoes/serializers.py` & `frontend/src/pages/ConfiguracoesNotificacoesPage.tsx`).
- [x] **TASK-NOT-08:** Cobertura de testes automatizados unitários e de integração 🟢 (`backend/tests/test_configuracoes_notificacoes.py`).
