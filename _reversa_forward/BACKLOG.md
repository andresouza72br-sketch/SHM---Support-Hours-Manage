# Backlog de Evolução Forward — SHM 2.4

> Gerenciado pelo framework **Reversa**.

---

## 📌 Features Priorizadas no Backlog

### Feature 003: Integração de Notificações e Magic Links via Telegram Bot API
- **Identificador Previsto:** `003-notificacoes-telegram`
- **Status:** `Backlog Priorizado (Aguardando Execução Futura)` ⏳
- **Modo de Execução:** `/reversa-forward` em modo YOLO
- **Escopo e Objetivos:**
  1. Integração com Telegram Bot API (`python-telegram-bot` ou requests assíncronos) para envio de mensagens ricas com botões inline.
  2. Notificação instantânea para o Gerente do Cliente quando um orçamento de ciclo for apresentado ou quando o aceite for solicitado.
  3. Envio seguro de **Magic Links** de uso único para aprovação ou aceite formal em 1 clique diretamente pelo celular.
  4. Notificações operacionais para técnicos da empresa sobre novos chamados abertos e aprovações de orçamentos.
  5. Vinculação simplificada via `/start <token_usuario>` na interface do Telegram.
- **Artefatos de Domínio Relacionados:**
  - `_reversa_sdd/notificacoes/`
  - `_reversa_sdd/comunicacao/`
  - `_reversa_sdd/adrs/003-magic-links-publicos-sem-atrito.md`

---

## 🏁 Features Concluídas

| Feature | Identificador | Status | Homologação | Adendo SDD |
|---|---|---|---|---|
| **Feature 001** | `001-trava-tolerancia-ciclos` | Concluída 🟢 | Commit `a5c0626` | [`001-trava-tolerancia-ciclos.md`](file:///C:/Users/andre/orca/workspaces/projeto-SHM/Reversa-g37f-yolo/_reversa_sdd/addenda/001-trava-tolerancia-ciclos.md) |
| **Feature 002** | `002-migracao-saldo-contratos` | Concluída 🟢 | 2026-08-27 | [`002-migracao-saldo-contratos.md`](file:///C:/Users/andre/orca/workspaces/projeto-SHM/Reversa-g37f-yolo/_reversa_sdd/addenda/002-migracao-saldo-contratos.md) |
