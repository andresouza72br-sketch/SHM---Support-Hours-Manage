# Investigação Técnica: Migração e Aproveitamento de Saldo

## 1. Contexto e Motivação
No modelo de negócio do SHM, contratos de horas de suporte possuem períodos de franquia e validade. Quando um contrato expira, as horas não utilizadas frequentemente precisam ser migradas para o novo contrato de renovação do cliente mediante negociação comercial ou carência.
Atualmente, o sistema conta apenas com a transferência genérica entre contratos, sem inteligência para listar contratos expirados, verificar carência e vincular com contratos de renovação.

## 2. Alternativas Avaliadas
- **Alternativa A (Escolhida):** Assistente inteligente acoplado ao `SaldoService` e `SaldoViewSet`. Utiliza a tabela de ledger existente e `ContratoAuditLog`, garantindo simplicidade e consistência.
- **Alternativa B:** Criação de modelo de dados próprio `MigracaoSaldoContrato`. Descartada por adicionar complexidade e redundância desnecessárias ao ledger imutável.

## 3. Padrões Aplicados
- **Service Layer Pattern:** Toda regra transacional centralizada no `SaldoService`.
- **Optimistic/Pessimistic Locking:** `select_for_update()` para evitar condições de corrida em transferências de saldo financeiro de horas.
