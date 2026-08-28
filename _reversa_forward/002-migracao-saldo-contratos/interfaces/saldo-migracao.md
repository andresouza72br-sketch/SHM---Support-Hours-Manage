# Interface REST: Migração de Saldo de Contratos

## 1. GET `/api/saldo/contratos_elegiveis/`
- **Query Params:**
  - `cliente_id` (int, obrigatório): ID do cliente.
  - `destino_id` (int, opcional): ID do contrato de destino para exclusão da lista.
- **Permissão:** `IsEmpresaAdmin`
- **Response 200 OK:**
```json
[
  {
    "id": 12,
    "numero": "CT-2025-001",
    "saldo": "15.00",
    "horas_contratadas": "50.00",
    "status": "expirado",
    "data_termino": "2026-01-31",
    "data_fim_carencia": "2026-03-02"
  }
]
```

## 2. POST `/api/saldo/migrar/`
- **Body:**
```json
{
  "contrato_origem": 12,
  "contrato_destino": 15,
  "quantidade": "15.00",
  "motivo": "Aproveitamento de saldo de contrato encerrado"
}
```
- **Permissão:** `IsEmpresaAdmin`
- **Response 200 OK:**
```json
{
  "detail": "Migração de saldo concluída com sucesso.",
  "transferencia_id": 4,
  "saldo_origem": "0.00",
  "saldo_destino": "65.00"
}
```
- **Response 400 Bad Request:**
```json
{
  "detail": "Transferência permitida apenas entre contratos do mesmo cliente."
}
```
