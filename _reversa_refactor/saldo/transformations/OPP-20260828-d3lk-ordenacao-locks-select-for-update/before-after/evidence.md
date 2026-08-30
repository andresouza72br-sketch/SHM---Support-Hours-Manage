# Evidência de Equivalência e Medição - OPP-20260828-d3lk

> Contexto: `saldo`  
> Verbo: `optimize`  
> Método de Preservação: `equivalence-proof`

---

## 1. Medição de Desempenho e Concorrência

| Dimensão | Antes | Depois | Ganho Comprovado |
|---|---|---|---|
| **Risco de Deadlock Concorrente** | Alto sob transferências cruzadas simultâneas | 0% (ordem canônica de bloqueio garantida no banco) | **100% Prevenção** |
| **Roundtrips SQL de Lock** | 2 queries independentes (`SELECT ... FOR UPDATE`) | 1 query unificada (`SELECT ... WHERE id IN (...) ORDER BY id FOR UPDATE`) | **-50% Queries** |
| **Complexidade de Tempo** | O(1) | O(1) | Preservada |
| **Complexidade de Espaço** | O(1) | O(1) | Preservada |

---

## 2. Prova de Equivalência Funcional

1. **Mesma Assinatura e Retorno:**
   Os métodos `transferir`, `migrar_saldo_contratos_vencidos` e `compensar_debito_contrato_anterior` continuam recebendo e retornando os mesmos tipos e estruturas (`TransferenciaSaldo`, `dict`, etc.).
2. **Preservação de Exceções de Domínio:**
   - Se os IDs forem iguais: dispara `ValidationError("O contrato de origem e destino não podem ser iguais.")`.
   - Se algum contrato não existir: dispara `Contrato.DoesNotExist` preservando o comportamento do Django ORM.
   - Validações de saldo e mesmo cliente são executadas normalmente após a obtenção dos contratos.
3. **Persistência de Ledger e Auditoria:**
   Todos os lançamentos no `shm_historico_saldo` e `shm_contrato_audit_log` permanecem estritamente idênticos.
