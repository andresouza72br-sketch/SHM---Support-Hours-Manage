# 🏛️ Documento de Arquitetura do SHM 2.5 (Main Release 2.5 — Governança Forense & SDD)

## 1. Visão Geral e Princípios Arquiteturais

O SHM 2.5 foi concebido seguindo os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)** modular no Django e uma separação estrita entre o cliente Frontend (SPA) e a API Backend RESTful.

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
        string tipo_operacao "consumo / transferencia / reabastecimento"
        decimal quantidade
        decimal saldo_resultante
        string ip_origem
        string user_agent
        datetime criado_em
    }

    TRANSFERENCIA_SALDO {
        uuid id PK
        int contrato_origem_id FK
        int contrato_destino_id FK
        decimal quantidade
        string motivo
        datetime criado_em
    }

    CONTRATO_AUDIT_LOG {
        uuid id PK
        int contrato_id FK
        string tipo_evento "aceite / migracao_saldo / compensacao_debito"
        string descricao
        string justificativa
        string ip_origem
        string user_agent
        datetime criado_em
    }

    AVALIACAO_CICLO {
        uuid id PK
        int ciclo_id FK
        int nota "1 a 5 estrelas"
        string comentario
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

O SHM 2.5 implementa 4 níveis de perfis de acesso:
1. **`EMPRESA_ADMIN`**: Acesso irrestrito a todos os clientes, gestão financeira de contratos, reabastecimentos, transferências e configuração de equipe.
2. **`EMPRESA_TECNICO`**: Acesso à fila operacional, triagem de pedidos, emissão de orçamentos e apontamento de tarefas.
3. **`CLIENTE_GERENTE`**: Tomador do contrato. Possui permissão para autorizar orçamentos, aprovar/recusar aceites finais e visualizar extratos financeiros.
4. **`CLIENTE_ANALISTA`**: Usuário operacional do cliente. Pode abrir pedidos de suporte e interagir nos comentários dos ciclos.

---

## 5. Racional da Stack Tecnológica & Decisões Arquiteturais (ADR Synthesis)

Alinhado ao [**Manifesto de Engenharia SHM**](Manifesto/manifesto.md) e ao guia **SWEBOK**, cada elemento da stack foi selecionado para atuar como **fronteira de contenção (Agent Harness)**:

1. **Django 5.2 + DRF vs. Microframeworks**:
   - *Decisão*: Optou-se pelo Django devido à solidez do seu ORM transacional (`@transaction.atomic`), motor de migrações determinísticas e autenticação RBAC nativa.
   - *Ganho de Engenharia*: Impede que agentes de IA reinventem regras contábeis, garantindo consistência ACID no livro-razão `HistoricoSaldo`.
2. **React 19 + TypeScript 5.7 vs. JavaScript Puro**:
   - *Decisão*: Tipagem estrita ponta a ponta com interfaces compartilhadas.
   - *Ganho de Engenharia*: O compilador TypeScript atua como portão imediato de verificação pré-runtime, eliminando quebras de contrato de API.
3. **Reversa (SDD) & Impeccable (Craft UI/UX)**:
   - *Decisão*: Especificações vivas em `_reversa_sdd/` e heurísticas rigorosas de interface.
   - *Ganho de Engenharia*: Elimina o *Vibe Coding* e o débito técnico estético (*AI slop*), mantendo a evolução linear e previsível.
4. **Ferramental Dev Próprio (`tools/`)**:
   - *Decisão*: Servidor SMTP local (`dev_mail_server.py`) e orquestrador CLI (`dev.ps1`).
   - *Ganho de Engenharia*: Ambiente de testes 100% autossuficiente e offline, com custo zero de infraestrutura e privacidade total de dados em desenvolvimento.