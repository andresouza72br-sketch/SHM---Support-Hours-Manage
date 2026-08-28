# Data Delta: Migração e Aproveitamento de Saldo

## 1. Modificações no Modelo de Dados
- **Tabelas Afetadas:**
  - `shm_contrato`: Atualização de campos `saldo` em ambos os contratos envolvidos.
  - `shm_transferencia_saldo`: Registro criado com `motivo="Aproveitamento de saldo de contrato expirado: ..."` e vínculo entre contratos.
  - `shm_historico_saldo`: 2 registros gerados (`TRANSFERENCIA_ENVIO` e `TRANSFERENCIA_RECEBIMENTO`).
  - `shm_contrato_audit_log`: Registros de auditoria gerados para o contrato de origem e contrato de destino.

- **Novas Migrações:** Nenhuma necessária (schema compatível).
