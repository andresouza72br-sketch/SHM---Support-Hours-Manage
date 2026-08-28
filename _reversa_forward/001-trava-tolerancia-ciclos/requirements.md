# Especificação de Requisitos — Feature 001: Trava de Tolerância de 30% no Aceite de Ciclos

> **Feature ID:** `001-trava-tolerancia-ciclos`  
> **Status:** `Aprovado` 🟢  
> **Ancoragem Legado:** [`_reversa_sdd/ciclos/requirements.md`](file:///C:/Users/andre/orca/workspaces/projeto-SHM/Reversa-g37f-yolo/_reversa_sdd/ciclos/requirements.md), [`_reversa_sdd/domain.md`](file:///C:/Users/andre/orca/workspaces/projeto-SHM/Reversa-g37f-yolo/_reversa_sdd/domain.md)

---

## 1. Problema de Negócio & Contexto

Atualmente no SHM 2.4, quando um ciclo técnico é orçado e aprovado pelo cliente com `horas_estimadas` (ex: 10h), o técnico aponta tarefas com `horas_realizadas` (ex: 16h). No momento do aceite formal (`CicloService.aceitar_ciclo`), o sistema debita a totalidade de `horas_realizadas` sem validar se o acréscimo foi desproporcional ao orçado.

Isso gera risco de surpresas financeiras e contestações no faturamento.

---

## 2. Requisitos da Feature

### **RF-001-01 (Must): Validação de Teto de 30% no Aceite Formal**
- No fluxo de concessão de aceite formal do ciclo (`POST /api/v1/ciclos/{id}/aceitar/` e `CicloService.aceitar_ciclo`):
  - Calcular o teto permitido: `limite_tolerancia = horas_estimadas * Decimal('1.30')`.
  - Se `horas_estimadas > 0` e `horas_realizadas > limite_tolerancia`:
    - **Bloquear** a concessão do aceite com erro de validação HTTP 400 Bad Request.
    - Retornar mensagem explicativa: *"Horas realizadas ({horas_realizadas}h) excedem o limite de tolerância de 30% sobre o orçamento aprovado ({horas_estimadas}h). Limite máximo permitido: {limite_tolerancia}h. Solicite um aditivo de escopo ou reorçamento."*

### **RF-001-02 (Must): Aceite Permitido dentro da Margem de 30%**
- Se `horas_realizadas <= limite_tolerancia`, o aceite deve ser processado normalmente, debitando `horas_realizadas` no ledger `HistoricoSaldo`.

### **RF-001-03 (Should): Feedback Visual no Frontend**
- Na tela de aceite do ciclo e no card do ciclo no Kanban/Detalhes, exibir alerta visual amarelo quando `horas_realizadas > horas_estimadas` mas dentro dos 30% (*"Acima do orçado (+X%), dentro da margem de tolerância"*).
- Exibir badge vermelho bloqueante quando ultrapassar 30% (*"Tolerância excedida (+X%) — Bloqueado para aceite"*).

---

## 3. Critérios de Aceitação (Gherkin)

```gherkin
Funcionalidade: Controle de Tolerância no Aceite de Ciclos

  Cenário: Aceite bem-sucedido dentro da margem de 30%
    Dado um ciclo orçado com 10.00h aprovadas
    E tarefas realizadas totalizando 12.50h (25% acima)
    Quando o cliente solicita o aceite formal
    Então o sistema efetua o aceite com sucesso
    E debita 12.50h no saldo do contrato.

  Cenário: Bloqueio de aceite com horas excedendo 30%
    Dado um ciclo orçado com 10.00h aprovadas
    E tarefas realizadas totalizando 13.50h (35% acima)
    Quando o cliente solicita o aceite formal
    Então o sistema recusa a transação com código 400
    E exibe mensagem de limite de tolerância de 30% excedido
    E nenhuma hora é debitada do contrato.
```
