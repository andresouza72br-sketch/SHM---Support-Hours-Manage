# User Story — Fluxo de Governança de Notificações e Supressão para o Autor

> Gerado pelo **Reversa Writer** em 2026-09-04  
> Sistema: **SHM 2.5.0**  
> Confiança: 🟢 CONFIRMADO

## US-NOT-01: Governança de Alertas e Redução de Ruído
**Como** Administrador da Empresa,  
**Quero** configurar quais eventos do sistema disparam e-mails e notificações in-app, definindo destinatários por papel e ativando a supressão para o autor da ação,  
**Para que** a equipe técnica e os clientes recebam apenas comunicações pertinentes, sem poluição de caixa de entrada ou auto-notificações redundantes no sininho.

### Critérios de Aceitação (Gherkin)

#### Cenário 1: Invariante do Sininho In-App (Nunca Notificar o Autor)
- **Dado** que estou autenticado como usuário técnico ou cliente,
- **Quando** executo uma ação que gera notificação (ex: cadastro um comentário em ciclo ou abro um chamado),
- **Então** o sistema processa o evento e grava notificações para os demais participantes,
- **E** o meu próprio usuário é descartado da lista in-app (`destinatarios_in_app.discard(autor)`),
- **E** nenhum novo badge ou item referente à minha própria ação aparece no meu sininho de notificações.

#### Cenário 2: Supressão Declarativa de E-mail com `nao_enviar_autor = True`
- **Dado** que o evento `COMENTARIO_CRIADO` está configurado com `nao_enviar_autor = True`,
- **E** o meu papel RBAC está marcado como destinatário do evento,
- **Quando** eu adiciono um novo comentário na thread técnica,
- **Então** o e-mail de notificação é despachado para os demais destinatários e membros da equipe,
- **E** o meu endereço de e-mail é expurgado da lista de envio principal e da lista de cópia (`emails_cc`),
- **E** eu não recebo cópia por e-mail da minha própria mensagem.

#### Cenário 3: Habilitação de Cópia por E-mail sob Demanda
- **Dado** que sou Administrador da Empresa na página `/admin/configuracoes/notificacoes`,
- **Quando** abro a Matriz de Destinatários do evento `PEDIDO_CRIADO` e desmarco a opção "Não enviar para o autor (Quem executou a ação)",
- **Então** a configuração é persistida com `nao_enviar_autor = False`,
- **E** nas aberturas subsequentes de pedidos, o autor da abertura recebe a confirmação formal por e-mail (caso seu papel esteja habilitado),
- **E** a invariante in-app permanece ativa (sininho continua livre de auto-notificação).
