# Matriz de Impacto de Especificações (Spec Impact Matrix) — SHM 2.5.0

> Gerado pelo **Reversa Architect** em 2026-09-03  
> Sistema: **SHM 2.5.0 (Support Hours Manager)**

---

| Componente Impactante | Componente Impactado | Tipo de Relação | Efeito / Comportamento do Impacto |
|---|---|---|---|
| `saldo` (Consumo) | `contratos` | Débito em Saldo | Reduz `contrato.saldo` e incrementa `contrato.horas_consumidas` de forma atômica |
| `saldo` (Consumo) | `notificacoes` | Disparo de Alerta | Dispara alerta automático de saldo ao ultrapassar 80% da franquia ou ao esgotar saldo |
| `saldo` (Migração) | `contratos` | Transferência Contábil | Transfere saldo de contrato vencido para novo contrato ativo com lock ordenado anti-deadlock |
| `ciclos` (Aceite) | `saldo` | Liquidação | Ao conceder aceite formal, invoca `SaldoService.consumir` debitando as horas reais executadas |
| `ciclos` (Tolerância +30%) | `notificacoes` | Alerta Operacional | Grava na timeline e alerta o gestor caso o ciclo exceda 30% das horas estimadas no orçamento |
| `tarefas` (Apontamento) | `ciclos` | Agregação Atômica | Salvar ou excluir uma tarefa recalcula e atualiza `ciclo.horas_realizadas` |
| `ciclos` (Transição de Status) | `pedidos` | Sincronização de Status | O status do pedido pai é recalculado a partir do estado coletivo dos ciclos |
| `contratos` (Upload Documento) | `contratos` (Auditoria) | Registro SHA-256 | Upload calcula hash SHA-256 e grava evento no `ContratoAuditLog` |
| `notificacoes` (Gatilho) | `accounts` / `contratos` | Resolução de Destinatários | `ConfiguracaoNotificacao` filtra e resolve destinatários consultando papéis RBAC e lista CC |
