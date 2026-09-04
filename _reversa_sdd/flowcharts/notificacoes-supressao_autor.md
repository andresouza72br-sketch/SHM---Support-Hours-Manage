# Fluxograma — Notificações: Algoritmo de Supressão para o Autor da Ação (Feature 003)

> Função: `NotificacaoConfigService.resolver_destinatarios_evento` e `NotificacaoService.criar_notificacao`

```mermaid
flowchart TD
    Inicio([Início da Resolução de Destinatários]) --> ObterAutor[Identifica autor da ação / request.user]
    
    subgraph InApp_Sininho [Canal In-App: Invariante Estrita Universal]
        ObterAutor --> CheckUserInApp{autor is authenticated?}
        CheckUserInApp -- Sim --> RemoveSininho[destinatarios_in_app.discard autor]
        CheckUserInApp -- Não --> MantemInApp[destinatarios_in_app inalterado]
        RemoveSininho --> GravaNotif[Grava Notification apenas para terceiros]
        MantemInApp --> GravaNotif
    end
    
    subgraph Email_SMTP [Canal E-mail: Resolução Declarativa com Toggle]
        ObterAutor --> ConsultaFlag{config.nao_enviar_autor == True?}
        ConsultaFlag -- Não --> RetornaEmails[Retorna lista completa de destinatários e CC]
        ConsultaFlag -- Sim --> ExpurgarUsuarios[destinatarios_usuarios = [u for u in destinatarios_usuarios if u.id != autor.id]]
        ExpurgarUsuarios --> NormalizarCC[autor_email = autor.email.strip.lower]
        NormalizarCC --> ExpurgarCC[emails_cc = [email for email in emails_cc if email.strip.lower != autor_email]]
        ExpurgarCC --> RetornaFiltrados[Retorna destinatários e CC limpos de auto-notificação]
    end
    
    GravaNotif --> Fim([Fim da Operação])
    RetornaEmails --> Fim
    RetornaFiltrados --> Fim
```
