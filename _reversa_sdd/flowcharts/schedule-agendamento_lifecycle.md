# Ciclo de Vida e Processamento de Lembretes do Agendamento (Schedule)

> Mapeamento de Engenharia Reversa — SHM 2.5  
> Escala de Confiança: 🟢 CONFIRMADO (Extraído de `backend/apps/schedule/services.py`)

```mermaid
stateDiagram-v2
    [*] --> Agendado: ScheduleService.criar_agendamento()
    
    state Agendado {
        [*] --> LembretesCriados: 24h, 30m, 15m programados
        LembretesCriados --> LembreteDisparado: processar_lembretes_pendentes()
        LembreteDisparado --> LembreteEnviado: status = ENVIADO
    }

    Agendado --> EmAndamento: Horário da reunião atingido (data_inicio <= now <= data_fim)
    Agendado --> Cancelado: ScheduleService.cancelar_agendamento(motivo)
    Agendado --> Reagendado: ScheduleService.atualizar_agendamento(nova_data)

    state Cancelado {
        [*] --> CancelarGoogle: Remove evento do Google Calendar
        CancelarGoogle --> CancelarLembretes: Cancela lembretes pendentes
        CancelarLembretes --> AuditoriaCancelamento: ForensicAuditLog com Justificativa e Alerta
    }

    state Reagendado {
        [*] --> AtualizarGoogle: Atualiza horário no Google Calendar
        AtualizarGoogle --> RecalcularLembretes: Reprograma datas dos lembretes pendentes
        RecalcularLembretes --> NotificarAlteracao: E-mail e In-App para todos participantes
    }

    Reagendado --> Agendado: Novo horário estabelecido
    EmAndamento --> Realizado: Reunião concluída (data_fim ultrapassada ou confirmada)
    Realizado --> [*]
    Cancelado --> [*]
```
