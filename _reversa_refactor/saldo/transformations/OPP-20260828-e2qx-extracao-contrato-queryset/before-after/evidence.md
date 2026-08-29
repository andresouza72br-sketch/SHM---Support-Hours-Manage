# Evidência de Equivalência e Arquitetura - OPP-20260828-e2qx

> Contexto: `saldo`  
> Verbo: `restructure`  
> Método de Preservação: `tests` (Equivalência funcional estrita)

---

## 1. Métricas de Arquitetura e DRF

| Dimensão | Antes | Depois | Ganho |
|---|---|---|---|
| **Lógica de Domínio / ORM na View** | Construtores de `Q(...)` e filtros de data na view | 0 (delegado para o QuerySet do modelo) | **Views Enxutas (Thin Views)** |
| **Reusabilidade de Consultas** | Restrita aos endpoints de SaldoViewSet | Disponível globalmente via `Contrato.objects` | **100% Reusável** |
| **Cobertura de Testes** | 73 testes verdes | 73 testes verdes | **100% Preservado** |

---

## 2. Equivalência Funcional Observada

1. **Ordenação e Filtragem Idênticas:** `ContratoQuerySet.elegiveis_para_migracao()` e `ContratoQuerySet.devedores()` retornam exatamente o mesmo payload serializado nos endpoints `/api/v1/saldo/contratos_elegiveis/` e `/api/v1/saldo/contratos_devedores/`.
2. **Tratamento de Parâmetros:** A exclusão do `destino_id` e a obrigatoriedade de `cliente_id` permanecem intactas.
