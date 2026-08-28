# Questões Abertas e Dúvidas do Domínio (Questions)

> Gerado pelo **Reversa Reviewer** em 2026-08-27  
> Status: **TODAS AS QUESTÕES RESOLVIDAS** 🟢

---

## 1. Dúvidas Mapeadas & Decisões Homologadas

### Q-01: Política de Tolerância no Excesso de Horas do Ciclo 🟢 RESOLVIDO
- **Decisão Homologada:** Tolerância máxima de **30% de horas excedentes** sobre o orçamento aprovado (`horas_estimadas`).
- **Comportamento do Sistema:**
  - Até 30% acima de `horas_estimadas`: o aceite formal é permitido automaticamente e o débito real é efetuado no ledger.
  - Acima de 30%: o sistema **trava o aceite formal** e exige a emissão e aprovação prévia de aditivo de horas/reorçamento.
- **Artefatos Atualizados:** `_reversa_sdd/ciclos/requirements.md`, `_reversa_sdd/domain.md`.

---

### Q-02: Destino de Saldo Remanescente Expirado 🟢 RESOLVIDO
- **Decisão Homologada:** Sugestão e migração assistida de saldo remanescente na criação/renovação de contratos do mesmo cliente.
- **Comportamento do Sistema:**
  - Na inclusão de um novo contrato, aditivo ou renovação, o sistema identifica se o cliente possui contratos vencidos com saldo remanescente positivo.
  - O sistema exibe um assistente sugerindo a transferência/aproveitamento automático desse saldo remanescente para o novo contrato através de uma operação de migração auditada no `HistoricoSaldo`.
- **Artefatos Atualizados:** `_reversa_sdd/contratos/requirements.md`, `_reversa_sdd/saldo/requirements.md`.

---

### Q-03: Notificação Transacional & Roadmap Multicanal 🟢 RESOLVIDO
- **Decisão Homologada:**
  - **Escopo Atual (v2.4):** Manter exclusivamente envio transacional via **E-mail (SMTP)** com templates HTML e Magic Links seguros.
  - **Roadmap / Evolução Futura:** Registrado como requisito futuro o suporte a notificações e links rápidos via **WhatsApp Business API** e **Telegram Bot API**.
- **Artefatos Atualizados:** `_reversa_sdd/notificacoes/requirements.md`, `_reversa_sdd/gaps.md`.
