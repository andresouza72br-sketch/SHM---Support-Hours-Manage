# 🔌 Referência da API REST do SHM 2.5

A API do SHM segue os padrões RESTful com autenticação baseada em JWT (JSON Web Tokens) e documentação OpenAPI 3.0 interativa via Swagger UI disponível no endpoint `/api/docs/`.

---

## 🔐 1. Autenticação & Identidade

### `POST /api/v1/auth/token/`
Obtém o par de tokens JWT (`access` e `refresh`).

**Payload:**
```json
{
  "username": "gerente.acme",
  "password": "cliente123"
}
```

**Resposta (200 OK):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `POST /api/v1/auth/google/`
Autenticação federada via Google OAuth2 (Google Identity Services). Valida a assinatura criptográfica do ID Token junto ao Google e emite os tokens JWT caso o e-mail esteja cadastrado e ativo.

**Payload:**
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

### `GET /api/v1/auth/me/`
Retorna os dados do usuário autenticado, cliente vinculado e seus papéis no sistema (`EMPRESA_ADMIN`, `EMPRESA_TECNICO`, `CLIENTE_GERENTE`, `CLIENTE_ANALISTA`).

---

## 📋 2. Pedidos de Suporte

### `GET /api/v1/pedidos/`
Lista chamados de suporte com suporte a paginação e filtros por contrato, cliente ou status.

### `GET /api/v1/pedidos/kanban/`
Retorna os chamados agrupados pelos 6 estágios operacionais do Kanban:
`aberto`, `em_orcamento`, `aguardando_aprovacao`, `em_execucao`, `aguardando_aceite`, `concluido`.

### `POST /api/v1/pedidos/`
Cria um novo chamado com geração automática de protocolo sequencial `OSYYYYMMNNNN`.

---

## 🔄 3. Ciclos de Atendimento & Governança

### `POST /api/v1/ciclos/{id}/apresentar_orcamento/`
Emite a estimativa formal de horas do ciclo para avaliação do cliente e gera Magic Link de aprovação com expiração de 7 dias.

### `POST /api/v1/ciclos/{id}/aprovar/`
Aprova o orçamento pelo tomador do cliente (**não debita saldo do contrato**).

### `POST /api/v1/ciclos/{id}/rejeitar/`
Rejeita a proposta com justificativa técnica obrigatória.

### `POST /api/v1/ciclos/{id}/iniciar_execucao/`
Altera o status para `em_execucao` e habilita o lançamento de apontamentos/tarefas.

### `POST /api/v1/ciclos/{id}/solicitar_aceite/`
Consolida as horas reais executadas nas tarefas e dispara notificação e Magic Link de aceite formal.

### `POST /api/v1/ciclos/{id}/reenviar_magic_link/`
Gera e reenvia um novo token seguro UUIDv4 de Magic Link (válido por 7 dias) para ciclos em `aguardando_aprovacao` ou `aguardando_aceite`.

### `POST /api/v1/ciclos/{id}/aceitar/`
Formaliza o aceite do cliente e **debita exclusivamente as `horas_realizadas`** do contrato no Ledger.
- **Trava de Tolerância (+30%):** Se `horas_realizadas > horas_estimadas * 1.30`, exige o envio de `justificativa_excedente` no payload e gera auditoria de exceção em `ContratoAuditLog`.

**Payload com Justificativa de Exceção (se exceder +30%):**
```json
{
  "justificativa_excedente": "Acréscimo de horas autorizado pelo comitê técnico devido a complexidade imprevista na integração."
}
```

### `POST /api/v1/ciclos/{id}/avaliar/`
Registra a avaliação CSAT (1 a 5 estrelas) e comentário pós-aceite formal.

**Payload:**
```json
{
  "nota": 5,
  "comentario": "Excelente atendimento, entrega dentro do prazo acordado."
}
```

---

## ⏱️ 4. Gestão de Saldo, Contratos & Conciliação Atômica

### `GET /api/v1/saldo/contratos_elegiveis/`
Identifica e lista contratos do cliente aptos para operações de saldo:
- Contratos com **saldo positivo remanescente** para migração (expirados ou encerrados).
- Contratos com **saldo devedor/negativo** aptos para compensação.

### `POST /api/v1/saldo/migrar_saldo_contratos_vencidos/`
Executa a migração contábil atômica do saldo remanescente de um contrato encerrado/vencido para o novo contrato vigente.
- Suporta migração total (100%) ou parcial (quantidade específica).
- Utiliza lock ordenado por ID para prevenir deadlocks (`select_for_update`).
- Registra lançamentos correlacionados no Ledger (`transferencia_envio` e `transferencia_recebimento`) e emite evento em `ContratoAuditLog`.

**Payload:**
```json
{
  "contrato_origem_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "contrato_destino_id": "c7a85f64-5717-4562-b3fc-2c963f66afb2",
  "quantidade": 15.50,
  "motivo": "Aproveitamento de saldo de contrato encerrado CT-2025-0012 para renovação CT-2026-0003."
}
```

### `POST /api/v1/saldo/compensar_debito_contrato_anterior/`
Abate dívidas de horas de contratos encerrados com saldo negativo utilizando a franquia do novo contrato ativo.
- **Trava de Teto:** Bloqueia débitos superiores ao valor estrito da dívida (`abs(saldo_devedor)`).
- Atualiza ambos os contratos atomicamente e registra auditoria completa.

**Payload:**
```json
{
  "contrato_novo_id": "c7a85f64-5717-4562-b3fc-2c963f66afb2",
  "contrato_devedor_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "quantidade": 8.00,
  "motivo": "Quitação de débito de horas do contrato anterior CT-2025-0012."
}
```

### `GET /api/v1/saldo/extrato_detalhado/`
Retorna o extrato oficial consolidado com conciliação matemática transparente:
$$\text{Saldo Atual} = \text{Franquia Base} + \text{Resgates/Migrações} - \text{Compensações} - \text{Consumo Real}$$

---

## 📄 5. Contratos & Integridade Forense

### `GET /api/v1/contratos/`
Lista os contratos com cálculo dinâmico de vigência, status e carência.

### `POST /api/v1/contratos/{id}/upload_documento/`
Faz o upload de documentos e termos contratuais, calculando e persistindo o **hash criptográfico SHA-256** no momento do envio.

### `GET /api/v1/contratos/{id}/auditar_documentos/`
Recalcula o hash SHA-256 dos arquivos em disco e valida a correspondência exata com o registro persistido, garantindo inviolabilidade pericial.

### `GET /api/v1/contratos/{id}/trilha_forense/`
Retorna os registros periciais da **Fita de DNA Transacional** encadeada com SHA-256 da partição `contrato:{id}`.
- Suporta filtro por nível de relevância (`nivel=CRITICA` ou `nivel=OPERACIONAL`).
- Exibe o hash do bloco anterior (`previous_hash`), dados canônicos segundo a norma **RFC 8785** e hash gerado.

### `GET /api/v1/contratos/{id}/verificar_integridade/`
Executa o algoritmo de varredura monotônica sobre a partição do contrato:
- Retorna `200 OK` com `status: "integro"` se todos os elos forem matematicamente válidos.
- Retorna `409 Conflict` apontando a sequência exata e o timestamp do primeiro elo corrompido caso ocorra violação.

### `GET /api/v1/auditoria/painel_integridade/`
Retorna a saúde criptográfica global de todas as partições contratuais ativas no sistema, totalizando blocos íntegros e selos diários lavrados.

---

## 🪄 6. Magic Links Públicos (Zero Atrito)

### `GET /api/v1/ciclos/publico/{token}/`
Retorna os dados resumidos do ciclo e pedido para visualização segura sem necessidade de autenticação.

### `POST /api/v1/ciclos/publico/{token}/`
Executa ações de decisão pública (`aprovar_orcamento`, `rejeitar_orcamento`, `aceitar_ciclo`) com registro forense do IP de origem, User-Agent e carimbo temporal ISO-8601.

---

## 📅 7. Módulo Schedule (Reuniões Técnicas & Google Meet)

### `GET /api/v1/schedule/agendamentos/`
Lista reuniões técnicas com filtros opcionais: `cliente`, `pedido`, `ciclo`, `status`, `data_inicio_apos` e `data_inicio_antes`.

### `GET /api/v1/schedule/agendamentos/proxima/`
Retorna o próximo compromisso síncrono agendado com status `agendado` e `data_fim >= now()`.

### `POST /api/v1/schedule/agendamentos/`
Cria um agendamento e aciona a integração com **Google Calendar**:
- Cria sala **Google Meet** corporativa e retorna o link (`google_meet_link`).
- Cria atomicamente 3 lembretes programados (`24h`, `30m` e `15m` antes).
- Notifica os participantes via in-app e e-mail HTML (com supressão para o autor).

**Payload:**
```json
{
  "cliente": 1,
  "titulo": "Alinhamento Técnico: Homologação OS2026090001",
  "data_inicio": "2026-09-08T14:00:00Z",
  "duracao_minutos": 45,
  "descricao": "Apresentação dos ciclos executados e tira-dúvidas de homologação.",
  "tipo": "homologacao",
  "pedido": 12,
  "participantes": [2, 5],
  "sincronizar_google": true
}
```

### `POST /api/v1/schedule/agendamentos/{id}/cancelar/`
Cancela o evento técnico. Exige **motivo obrigatório** (mínimo 5 caracteres) que é carimbado com integridade criptográfica na trilha de auditoria forense do contrato/cliente.

**Payload:**
```json
{
  "motivo": "Reunião cancelada a pedido do tomador devido a choque de agenda da diretoria."
}
```