# 🏛️ Documento de Arquitetura do SHM 2.3 (Main Release 2.3 — Feature Clientes)

## 1. Visão Geral e Princípios Arquiteturais

O SHM 2.3 foi concebido seguindo os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)** modular no Django e uma separação estrita entre o cliente Frontend (SPA) e a API Backend RESTful.

```mermaid
graph TD
    Client[React 19 SPA] <-->|JSON / JWT / OpenAPI| API[Django REST Framework]
    API --> Accounts[apps.accounts]
    API --> Clientes[apps.clientes]
    API --> Contratos[apps.contratos]
    API --> Pedidos[apps.pedidos]
    API --> Ciclos[apps.ciclos]
    API --> Tarefas[apps.tarefas]
    API --> Saldo[apps.saldo]
    API --> Comunicacao[apps.comunicacao]
    API --> Notificacoes[apps.notificacoes]
    
    Saldo --> DB[(Database PostgreSQL / SQLite)]
    Contratos --> DB
    Pedidos --> DB
    Ciclos --> DB
```

---

## 2. Modelagem de Dados & ERD

```mermaid
erDiagram
    CLIENTE ||--o{ CONTRATO : "possui"
    CONTRATO ||--o{ PEDIDO : "vincula"
    PEDIDO ||--|{ CICLO : "decomposto em"
    CICLO ||--o{ TAREFA : "composto por"
    CONTRATO ||--o{ HISTORICO_SALDO : "registra ledger"
    CICLO ||--o{ COMENTARIO : "possui"
    PEDIDO ||--o{ TIMELINE_EVENT : "gera eventos"

    CLIENTE {
        int id PK
        string tipo "PF / PJ"
        string razao_social
        string cnpj
        string nome_completo
        string cpf
        string status "ativo / inativo"
    }

    CONTRATO {
        int id PK
        string numero UK "CT-YYYY-NNNN"
        date data_inicio
        date data_termino
        decimal horas_contratadas
        decimal saldo
        decimal horas_consumidas
        date data_fim_carencia
        string status "ativo / expirado"
    }

    PEDIDO {
        int id PK
        string protocolo UK "OSYYYYMMNNNN"
        string assunto
        string descricao
        string prioridade "baixa / media / alta / urgente"
        string status "aberto / em_execucao / concluido"
    }

    CICLO {
        int id PK
        int pedido_id FK
        string tipo "corretiva / evolutiva / etc"
        decimal horas_estimadas
        decimal horas_realizadas
        string status "orcado / aprovado / em_execucao / aceito"
        uuid token_acesso UK "Magic Link"
    }

    TAREFA {
        int id PK
        int ciclo_id FK
        string descricao
        decimal horas_estimadas
        decimal horas_realizadas
        string status "prevista / realizada"
    }

    HISTORICO_SALDO {
        uuid id PK
        int contrato_id FK
        string tipo_operacao "consumo / transferencia / estorno"
        decimal quantidade
        decimal saldo_resultante
        datetime criado_em
    }
```

---

## 3. Diagrama de Sequência: Ciclo de Atendimento & Débito no Aceite

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as 👤 Cliente (Gerente)
    participant Front as 💻 Frontend Web
    participant API as ⚙️ Backend API
    actor Tecnico as 🛠️ Técnico / Empresa
    participant Ledger as 📜 Ledger Saldo

    Cliente->>Front: Abre Pedido (OS2026080001)
    Front->>API: POST /api/v1/pedidos/
    API-->>Front: Pedido criado com status "Aberto"

    Tecnico->>API: POST /api/v1/ciclos/ (Decompõe em Ciclo Corretiva, 8h est.)
    Tecnico->>API: POST /api/v1/ciclos/{id}/apresentar_orcamento/
    Note over API: Pedido passa para "Aguardando Aprovação"

    Cliente->>Front: Aprova Orçamento (pelo painel ou Magic Link)
    Front->>API: POST /api/v1/ciclos/{id}/aprovar/
    Note over API,Ledger: ⚠️ SALDO PERMANECE INTACTO (0h debitadas)

    Tecnico->>API: POST /api/v1/ciclos/{id}/iniciar_execucao/
    Tecnico->>API: POST /api/v1/tarefas/ (Lança tarefa: 6h reais executadas)
    Tecnico->>API: POST /api/v1/ciclos/{id}/solicitar_aceite/

    Cliente->>Front: Concede Aceite Final do Ciclo
    Front->>API: POST /api/v1/ciclos/{id}/aceitar/
    API->>Ledger: SaldoService.consumir(6.00h reais)
    Ledger-->>API: Saldo Atualizado (100h - 6h = 94h)
    Note over API: Pedido atualizado para "Concluído"
    API-->>Front: Ciclo Aceito com Sucesso
```

---

## 4. Segurança & Controle de Acesso (RBAC)

O SHM 2.0 implementa 4 níveis de perfis de acesso:
1. **`EMPRESA_ADMIN`**: Acesso irrestrito a todos os clientes, gestão financeira de contratos, reabastecimentos, transferências e configuração de equipe.
2. **`EMPRESA_TECNICO`**: Acesso à fila operacional, triagem de pedidos, emissão de orçamentos e apontamento de tarefas.
3. **`CLIENTE_GERENTE`**: Tomador do contrato. Possui permissão para autorizar orçamentos, aprovar/recusar aceites finais e visualizar extratos financeiros.
4. **`CLIENTE_ANALISTA`**: Usuário operacional do cliente. Pode abrir pedidos de suporte e interagir nos comentários dos ciclos.