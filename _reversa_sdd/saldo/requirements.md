# Requisitos do Módulo Saldo

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Ledger append-only imutável de saldo (`HistoricoSaldo`), transferências de horas entre contratos do mesmo cliente e reabastecimentos autorizados.

## 2. Requisitos Funcionais
- **RF-SAL-01 (Must):** Registrar consumo negativo no ledger exclusivamente no aceite de ciclos 🟢.
- **RF-SAL-02 (Must):** Executar transferências de horas apenas entre contratos do mesmo cliente 🟢.
- **RF-SAL-03 (Must):** Usar `select_for_update()` em todas as movimentações financeiras de horas 🟢.
