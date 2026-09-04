# Diagrama Entidade-Relacionamento Completo (ERD) — SHM 2.5.0

```mermaid
erDiagram
    shm_user ||--o{ shm_cliente : "pertence_a (se cliente)"
    shm_cliente ||--o{ shm_contrato : "possui"
    shm_cliente ||--o{ shm_pedido : "abre"
    shm_cliente ||--o{ shm_cliente_audit_log : "registra"
    shm_cliente ||--o{ shm_cliente_aceite_link : "possui"

    shm_contrato ||--o{ shm_contrato : "aditivo_de (recursivo)"
    shm_contrato ||--o{ shm_contrato_documento : "possui"
    shm_contrato ||--o{ shm_contrato_audit_log : "registra"
    shm_contrato ||--o{ shm_contrato_email_notificacao : "destinatarios"
    shm_contrato ||--o{ shm_historico_saldo : "movimentacoes_saldo"
    shm_contrato ||--o{ shm_transferencia_saldo : "origem/destino"
    shm_contrato ||--o{ shm_reabastecimento : "recebe"

    shm_pedido ||--o{ shm_ciclo : "decomposto_em"
    shm_pedido ||--o{ shm_anexo_pedido : "possui"
    shm_pedido ||--o{ shm_timeline_event : "timeline"

    shm_ciclo ||--o{ shm_tarefa : "composto_por"
    shm_ciclo ||--o{ shm_ciclo_magic_link : "magic_links"
    shm_ciclo ||--o{ shm_avaliacao_ciclo : "avaliacao"
    shm_ciclo ||--o{ shm_comentario : "comentarios"
    shm_ciclo ||--o{ shm_historico_saldo : "consumos"

    shm_comentario ||--o{ shm_comentario : "resposta_de (parent)"
    shm_comentario ||--o{ shm_anexo_comentario : "anexos"
    shm_comentario ||--o{ shm_reacao_comentario : "reacoes"

    shm_user ||--o{ shm_notification : "notificacoes_in_app"

    shm_configuracao_notificacao {
        bigint id PK
        string codigo UK
        string categoria
        string nome
        boolean ativo_email
        boolean ativo_in_app
        boolean notificar_empresa_admin
        boolean notificar_empresa_tecnico
        boolean notificar_cliente_gerente
        boolean notificar_cliente_comum
        boolean notificar_gestor_contrato
        boolean notificar_emails_cc
        json emails_adicionais
        boolean bloqueado_edicao
        boolean nao_enviar_autor
    }
```
