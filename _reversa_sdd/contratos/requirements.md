# Requisitos do Módulo Contratos

> Gerado pelo **Reversa Writer** em 2026-09-03  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Gestão completa do ciclo de vida contratual, regras de vigência e carência de 30 dias, custódia de documentos com integridade SHA-256, gestão de destinatários de notificações e trilha de auditoria periciável.

## 2. Requisitos Funcionais
- **RF-CON-01 (Must):** Numeração unívoca no padrão `CT-YYYY-NNNN` 🟢.
- **RF-CON-02 (Must):** Suporte a tipos `novo`, `aditivo` (com vínculo recursivo) e `renovacao` 🟢.
- **RF-CON-03 (Must):** Carência de 30 dias após data de término para consumo de saldo positivo remanescente 🟢.
- **RF-CON-04 (Must):** Armazenamento de arquivos com cálculo e gravação de hash SHA-256 no momento do upload 🟢.
- **RF-CON-05 (Must):** Endpoint de verificação de integridade documental (`/verificar_integridade/`) que compara o hash persistido contra o hash recalculado do arquivo em storage 🟢.
- **RF-CON-06 (Must):** Gestão de lista de e-mails de notificação (`ContratoEmailNotificacao`) com envio de convites de confirmação (tokens de 7 dias) e registro de opt-in 🟢.
- **RF-CON-07 (Must):** Trilha de auditoria periciável (`ContratoAuditLog`) registrando eventos de criação, alteração, upload, exclusão de documentos, migrações de saldo e convites de notificação 🟢.
