# ADR 013: Agendamento de Reuniões Técnicas, Integração Google Meet e Disparo Programado de Lembretes

## Status
Aceito e Implementado (Feature 005 - Schedule) 🟢

## Contexto
O processo de atendimento e suporte demanda alinhamentos síncronos frequentes entre clientes e equipe técnica (apresentação de orçamentos, homologação de chamados, suporte emergencial). Anteriormente, links de videoconferência eram trocados manualmente em comentários, gerando desencontros de fuso, falta de registro em ata e ausência de trilha auditável de cancelamento.

## Decisão
1. **Módulo Centralizado (`apps.schedule`):** Implementar entidade `Agendamento` vinculada obrigatoriamente a um Cliente e opcionalmente a Pedido (OS), Ciclo ou Tarefa.
2. **Integração Bidirecional Google Calendar & Google Meet (`GoogleCalendarService`):** Prover criação automática de salas Google Meet (`google_meet_link`) persistidas no banco, permitindo acesso em 1 clique tanto pelo organizador quanto pelos participantes.
3. **Escalada de Lembretes Programados (`LembreteAgendamento`):** Criação atômica de 3 marcos temporais (`24h`, `30m`, `15m` antes do evento). Rotina de disparo idempotente que envia alertas in-app e e-mails HTML com botão de chamada para ação.
4. **Governança Declarativa & Supressão para o Autor:** Evento `SCHEDULE_AGENDAMENTO_CRIADO` integrado à matriz de notificações, respeitando o princípio de que o organizador que agendou não é poluído com auto-alertas in-app.
5. **Auditoria Forense de Cancelamento:** Cancelamento exige justificativa textual obrigatória gravada com integridade criptográfica no `ForensicAuditService` (nível `OPERACIONAL` ou `CRITICA`).

## Alternativas Consideradas
- **Apenas link manual colado pelo usuário:** Descartado por falta de padronização, ausência de salas corporativas sob demanda e sem garantia de presença.
- **Integração apenas com Microsoft Teams / Zoom:** Descartado nesta fase pelo ecossistema da aplicação já utilizar Google OAuth na autenticação de usuários.

## Consequências
- **Positivas:** Redução de no-show em reuniões com triplo lembrete; automação completa do link Meet; registro indelével na timeline e auditoria.
- **Trade-offs:** Dependência da API do Google Calendar; em caso de indisponibilidade externa ou credenciais não configuradas, o sistema opera em fallback registrando a reunião localmente sem gerar o link remoto.
