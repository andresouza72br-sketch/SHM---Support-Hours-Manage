# Requisitos do Módulo Saldo

> Gerado pelo **Reversa Writer** em 2026-09-03  
> Confiança: 🟢 CONFIRMADO & HOMOLOGADO

## 1. Visão Geral
Ledger append-only imutável de saldo (`HistoricoSaldo`), transferências entre contratos, reabastecimentos autorizados, migração de saldo remanescente de contratos vencidos e compensação de débitos anteriores.

## 2. Requisitos Funcionais
- **RF-SAL-01 (Must):** Registrar débito negativo no ledger (`HistoricoSaldo`) exclusivamente no aceite formal de ciclos técnicos 🟢.
- **RF-SAL-02 (Must):** Executar transferências de horas apenas entre contratos pertencentes ao mesmo cliente 🟢.
- **RF-SAL-03 (Must):** Utilizar `select_for_update()` com ordenação lexicográfica de IDs (`_obter_par_contratos_com_lock_ordenado`) em todas as operações de transferência, eliminando deadlocks 🟢.
- **RF-SAL-04 (Must) [Feature 002]:** Permitir a migração de saldo remanescente de contratos vencidos/expirados para contratos ativos do mesmo cliente (`migrar_saldo_contratos_vencidos`), com atualização atômica e auditoria em ambos contratos 🟢.
- **RF-SAL-05 (Must):** Permitir a compensação de saldo devedor/negativo de contrato anterior (`compensar_debito_contrato_anterior`) com horas da franquia do novo contrato, travado no teto da dívida 🟢.
- **RF-SAL-06 (Must):** Disparar alertas automáticos de saldo via `NotificacaoService.notificar_alerta_saldo` ao atingir 80% de consumo da franquia ou ao esgotar/negativar o saldo 🟢.

## 3. Critérios de Aceitação
```gherkin
Cenário: Migração de saldo de contrato encerrado para contrato ativo
  Dado que o Contrato A está encerrado e possui 15.50h de saldo remanescente
  E o Contrato B está ativo para o mesmo cliente com saldo de 20.00h
  Quando o administrador solicita a migração de 15.50h do Contrato A para o Contrato B
  Então o Contrato A tem seu saldo reduzido para 0.00h
  E o Contrato B passa a ter saldo de 35.50h
  E duas entradas correlacionadas são registradas no HistoricoSaldo e no ContratoAuditLog.
```
