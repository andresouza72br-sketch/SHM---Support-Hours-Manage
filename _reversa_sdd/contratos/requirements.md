# Requisitos do Módulo Contratos

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO & HOMOLOGADO

## 1. Visão Geral
Gestão contratual com código CT-YYYY-NNNN, controle de franquia de horas, vigência e carência de 30 dias, aditivos recursivos, rotina de aproveitamento/migração de saldo remanescente, hash SHA-256 de documentos e gestão de destinatários de notificações.

## 2. Requisitos Funcionais
- **RF-CON-01 (Must):** Controlar franquia de horas contratadas, saldo atual e horas consumidas 🟢.
- **RF-CON-02 (Must):** Calcular automaticamente carência de 30 dias pós-expiração (`data_fim_carencia`) e permitir consumo de saldo remanescente 🟢.
- **RF-CON-03 (Must):** Gerar hash SHA-256 no upload de documentos e fornecer endpoint de verificação de integridade 🟢.
- **RF-CON-04 (Must):** **Aproveitamento de Saldo Remanescente de Contratos Vencidos:** Na criação de um novo contrato, renovação ou aditivo, o sistema deve detectar automaticamente se o cliente possui contratos vencidos com saldo remanescente positivo e sugerir a migração/transferência integral ou parcial das horas para o novo contrato 🟢.
- **RF-CON-05 (Should):** Permitir aditivos vinculados ao contrato original (`contrato_referencia`) 🟢.

## 3. Critérios de Aceitação
```gherkin
Cenário: Sugestão de migração de saldo remanescente na renovação
  Dado que o cliente possui um contrato anterior CT-2025-0010 expirado com saldo de 18.50h
  Quando o administrador cria o contrato CT-2026-0001 para o mesmo cliente
  Então o sistema exibe alerta sugerindo importar as 18.50h remanescentes
  E ao confirmar, o saldo inicial do novo contrato é acrescido e uma transferência é auditada no ledger.
```
