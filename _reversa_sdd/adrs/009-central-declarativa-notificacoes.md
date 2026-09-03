# ADR 009: Central Declarativa de Notificações Multicanal

## Status
Aprovado / Implementado (v2.5.0)

## Contexto
Conforme o SHM evoluiu com novos eventos (migração de saldo, alertas de vencimento, integridade documental, aceite de ciclos, cadastro), o código de notificações apresentava hardcoding de destinatários e regras rígidas de envio, impossibilitando ajustes operacionais pelos administradores.

## Decisão
1. **Entidade ConfiguracaoNotificacao:** Criada tabela dedicada com chave única `codigo` e divisão em 6 categorias de domínio.
2. **Controle Declarativo de Canais:** Toggles booleanos independentes para `ativo_email` e `ativo_in_app`.
3. **Matriz de Destinatários por Papel RBAC:** Toggles granulares para notificar `empresa_admin`, `empresa_tecnico`, `cliente_gerente`, `cliente_comum`, `gestor_contrato` e `emails_cc`.
4. **E-mails Adicionais e Bloqueio de Edição:** Suporte a lista fixa de e-mails em JSON e flag `bloqueado_edicao` para eventos mandatórios da plataforma.

## Alternativas Consideradas
- **Configurações em arquivo `.env`:** Rejeitado por não permitir alterações em tempo de execução sem reinício da aplicação.
- **Regras dispersas no código de cada view:** Rejeitado pelo alto acoplamento e impossibilidade de governança unificada.

## Consequências
- **Positivas:** Autonomia total para o Administrador da Empresa calibrar o fluxo de alertas e mitigar spam ou ruído de e-mails.
