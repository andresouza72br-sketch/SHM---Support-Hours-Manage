# Design do Módulo Clientes

## 1. Modelos
- `Cliente`: tipo (PF/PJ), razao_social, cnpj, nome_completo, cpf, email_contato, status, emails_notificacao_padrao.
- `ClienteAceiteLink`: cliente (FK), token (UUIDv4), data_expiracao, usado.
- `ClienteAuditLog`: cliente_nome, tipo_evento, justificativa, usuario, ip_origem, user_agent.
