# Contratos — Clientes

## POST /api/v1/clientes/
**Request:** `{"tipo": "PJ", "razao_social": "Acme Corp Ltda", "cnpj": "12.345.678/0001-90", "email_contato": "contato@acme.com"}`  
**Response 201:** `{"id": 1, "status": "pendente_aprovacao", "display_name": "Acme Corp Ltda"}`
