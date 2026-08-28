# Design do Módulo Contratos

## 1. Modelos
- `Contrato`: numero, tipo, cliente (FK), data_inicio, data_termino, data_fim_carencia, horas_contratadas, saldo, status.
- `ContratoDocumento`: contrato (FK), arquivo, hash_sha256, tamanho_bytes, tipo_documento.
- `ContratoAuditLog`: contrato (FK), tipo_evento, justificativa, documento_hash, usuario, ip_origem.
