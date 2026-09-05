# Design Técnico do Módulo Schedule

> Gerado pelo **Reversa Writer** em 2026-09-05  
> Confiança: 🟢 CONFIRMADO

## 1. Arquitetura de Classes e Componentes

### 1.1 Modelos de Banco de Dados (`backend/apps/schedule/models.py`)
- **`Agendamento`:** Herda de `TimeStampedModel`, PK UUID. Mapeia o compromisso no banco `shm_agendamento`. Validação no método `save()` para garantir consistência entre `data_inicio`, `data_fim` e `duracao_minutos`.
- **`ParticipanteAgendamento`:** PK UUID, chave única composta `(agendamento, email)`. Mapeia participantes internos (`usuario_id`) e convidados externos.
- **`LembreteAgendamento`:** PK UUID, chave única composta `(agendamento, marco)`. Mapeia os marcos `24h`, `30m` e `15m` com estados `pendente`, `enviado`, `ignorado`, `cancelado` e `falha`.

### 1.2 Camada de Serviços (`backend/apps/schedule/services.py`)
- **`ScheduleService.criar_agendamento`:**
  - Executa transação atômica (`transaction.atomic`).
  - Aciona `GoogleCalendarService.criar_evento` para criar evento na nuvem e capturar `conferenceData.entryPoints[0].uri`.
  - Persiste participantes e gera os 3 lembretes determinísticos calculando `data_prevista = data_inicio - delta`.
  - Aciona `_notificar_e_auditar_criacao`, resolvendo destinatários via `NotificacaoConfigService` e gravando entrada na trilha forense (`ForensicAuditService`).
- **`ScheduleService.atualizar_agendamento`:**
  - Atualiza metadados e recalcula datas dos lembretes pendentes caso o horário tenha sido remarcado.
  - Sincroniza alteração no Google Calendar.
- **`ScheduleService.cancelar_agendamento`:**
  - Atualiza status para `CANCELADO`, registra `motivo_cancelamento`.
  - Cancela lembretes e remove evento do Google Calendar.
  - Grava evento de auditoria com nível `OPERACIONAL` ou `CRITICA`.
- **`ScheduleService.processar_lembretes_pendentes`:**
  - Executado periodicamente via cron ou endpoint gerencial.
  - Localiza lembretes com `status=PENDENTE` e `data_prevista <= timezone.now()`.
  - Dispara alertas por e-mail e in-app e atualiza para `status=ENVIADO`.

### 1.3 Camada de API REST (`backend/apps/schedule/views.py` e `serializers.py`)
- **`AgendamentoViewSet`:**
  - `list`, `retrieve`, `create`, `partial_update`.
  - `@action(detail=True, methods=["post"]) cancelar`: recebe `{ "motivo": "..." }`.
  - `@action(detail=False, methods=["get"]) proxima`: retorna a reunião mais próxima não concluída.
  - Filtros por: `cliente`, `pedido`, `ciclo`, `status`, `tipo`, `data_inicio_apos`, `data_inicio_antes`.
  - Permissões: `IsAuthenticated` com restrição estrita de tenant para usuários de clientes.

### 1.4 Frontend React 19 (`frontend/src/`)
- **`pages/SchedulePage.tsx`:** Dashboard completo de agenda com calendário, filtros e lista de compromissos.
- **`components/schedule/ModalAgendamento.tsx`:** Modal de criação e edição com campos de data/hora, cliente, pedido/ciclo e switch do Google Meet.
- **`components/dashboard/ProximaReuniaoWidget.tsx`:** Widget dinâmico na tela inicial com link direto para sala Google Meet.
