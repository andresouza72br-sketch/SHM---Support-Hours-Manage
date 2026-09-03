# Fluxograma — Notificações: Despacho Declarativo por Categoria e RBAC

```mermaid
flowchart TD
    Trigger([Gatilho de Evento do Sistema]) --> BuscaConfig[Consulta ConfiguracaoNotificacao pelo código do evento]
    BuscaConfig --> ConfigAtiva{Evento existe e está ativo?}
    
    ConfigAtiva -- Não --> Aborta[Descarta disparo de notificação]
    ConfigAtiva -- Sim --> AvaliaInApp{ativo_in_app == True?}
    
    AvaliaInApp -- Sim --> CriaNotification[Insere registro Notification para usuários elegíveis]
    AvaliaInApp -- Não --> AvaliaEmail
    
    CriaNotification --> AvaliaEmail{ativo_email == True?}
    AvaliaEmail -- Não --> Timeline[Registra TimelineEvent se vinculado a pedido/ciclo]
    
    AvaliaEmail -- Sim --> MontaLista[Constrói lista de e-mails destinatários baseada nos toggles RBAC: Admin, Técnico, Gerente Cliente, CC, Fixos]
    MontaLista --> RenderTemplate[Renderiza template HTML responsivo]
    RenderTemplate --> EnviaSMTP[Dispara e-mails via backend de e-mail]
    EnviaSMTP --> Timeline
    Timeline --> Fim([Fim do Processamento])
```
