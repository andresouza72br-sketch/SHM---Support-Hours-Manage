# 🔌 Referência da API REST do SHM 2.0

A API do SHM segue os padrões RESTful com autenticação baseada em JWT (JSON Web Tokens) e documentação OpenAPI interativa disponível no endpoint `/api/docs/`.

---

## 🔐 Autenticação

### `POST /api/v1/auth/token/`
Obtém o par de tokens JWT (`access` e `refresh`).

**Payload:**
```json
{
  "username": "gerente.acme",
  "password": "cliente123"
}
```

**Resposta:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `GET /api/v1/auth/me/`
Retorna os dados do usuário autenticado e seus papéis no sistema.

---

## 📋 Pedidos de Suporte

### `GET /api/v1/pedidos/`
Lista pedidos filtrados por contrato ou cliente vinculado.

### `GET /api/v1/pedidos/kanban/`
Retorna os pedidos agrupados pelos 6 estágios do Kanban:
- `aberto`
- `em_orcamento`
- `aguardando_aprovacao`
- `em_execucao`
- `aguardando_aceite`
- `concluido`

### `POST /api/v1/pedidos/`
Cria um novo chamado com protocolo `OSYYYYMMNNNN`.

---

## 🔄 Ciclos de Atendimento

### `POST /api/v1/ciclos/{id}/apresentar_orcamento/`
Emite a estimativa formal de horas do ciclo para avaliação do cliente.

### `POST /api/v1/ciclos/{id}/aprovar/`
Aprova o orçamento pelo tomador do cliente (sem debitar saldo).

### `POST /api/v1/ciclos/{id}/rejeitar/`
Rejeita a proposta com justificativa técnica.

### `POST /api/v1/ciclos/{id}/iniciar_execucao/`
Inicia a fase de desenvolvimento e apontamentos.

### `POST /api/v1/ciclos/{id}/solicitar_aceite/`
Notifica o cliente com o consolidado das horas reais executadas.

### `POST /api/v1/ciclos/{id}/aceitar/`
Concede o aceite formal e debita as **`horas_realizadas`** do contrato no ledger.

---

## 🪄 Magic Links Públicos

### `GET /api/v1/ciclos/publico/{token}/`
Retorna os detalhes do ciclo e pedido sem exigir login.

### `POST /api/v1/ciclos/publico/{token}/`
Executa a ação (`aprovar`, `rejeitar`, `aceitar`, `recusar`) via link seguro.