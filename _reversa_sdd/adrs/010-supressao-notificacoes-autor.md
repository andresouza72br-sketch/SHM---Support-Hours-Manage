# ADR 010: Supressão Seletiva de Notificação para o Autor da Ação

## Status
Aprovado / Implementado (v2.5.0 — Feature 003)

## Contexto
Na central de notificações e envio de e-mails, quando um usuário criava um chamado, adicionava um comentário ou aprovava um ciclo, ele próprio recebia o alerta no sininho in-app e cópia por e-mail quando seu papel constava na matriz de destinatários. Isso gerava ruído desnecessário, poluição na caixa de entrada e degradação da utilidade do sininho como canal de ciência e pendências.

## Decisão
1. **Invariante Universal In-App:** Aplicar salvaguarda estrita no `NotificacaoService` e `ContratoService` para que `destinatarios_in_app.discard(autor)` seja executado universalmente. O autor conectado nunca recebe no sininho alertas sobre suas próprias ações.
2. **Campo Declarativo `nao_enviar_autor`:** Adicionar campo booleano `nao_enviar_autor` no modelo `ConfiguracaoNotificacao` com `default=True`.
3. **Expurgo em Destinatários e CC de E-mail:** O método `resolver_destinatarios_evento` do `NotificacaoConfigService` expurga o autor da lista de usuários destinatários e elimina seu e-mail da lista `emails_cc` (com normalização case-insensitive) quando o toggle estiver ativo.
4. **Calibragem por Padrão:** Definir `nao_enviar_autor = True` para os 14 eventos operacionais de rotina (comentários, chamados, orçamentos, aceite) e `False` para os 8 eventos de convites de usuários, relatórios e processos de sistema.
5. **Governança no Frontend:** Expor o checkbox "Não enviar para o autor (Quem executou a ação)" no modal de Matriz de Destinatários na página de Governança de Notificações (`ConfiguracoesNotificacoesPage.tsx`).

## Alternativas Consideradas
- **Filtrar apenas no frontend durante a renderização do sininho:** Rejeitado pois persistiria registros inúteis no banco de dados e desperdiçaria queries.
- **Configuração global única (ligada/desligada para todo o sistema):** Rejeitado por falta de flexibilidade, impedindo que administradores recebessem confirmação por e-mail de aberturas de chamados caso desejado.
- **Filtrar apenas a lista de usuários, ignorando o CC:** Rejeitado pois o autor continuaria recebendo spam caso seu e-mail estivesse na lista CC de um cliente ou contrato.

## Consequências
- **Positivas:** Redução imediata de ruído no sininho in-app e caixas de entrada; preservação do histórico de chamados sem auto-notificações redundantes; flexibilidade operacional mantida por evento.
- **Mitigações:** Comportamento 100% testado com 16 testes dedicados, incluindo guarda segura para chamados/tarefas disparadas via cron/worker onde `autor` é `None`.
