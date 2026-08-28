# ADR 003: Magic Links Criptográficos de Uso Único para Aprovações

## Status
Aprovado / Implementado

## Contexto
Diretores e gestores tomadores frequentemente demoram para aprovar orçamentos por esquecerem senhas ou não quererem acessar sistemas web complexos em dispositivos móveis.

## Decisão
Criar Magic Links públicos contendo tokens UUIDv4 com validade de 7 dias para:
1. Aprovação e rejeição de orçamentos de ciclos.
2. Concessão e recusa de aceite formal de ciclos.
3. Aceite de cadastro de novos clientes.
4. Confirmação de e-mails de notificação.

## Consequências
- **Positivas:** Redução drástica do lead time de aprovação; aprovação em 1 clique no smartphone.
- **Segurança:** Tokens de uso único, expiração temporal curta e registro forense de IP e User-Agent.