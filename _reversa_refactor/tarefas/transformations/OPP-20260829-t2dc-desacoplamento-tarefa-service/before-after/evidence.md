# Evidencia de Desacoplamento e Medicao - OPP-20260829-t2dc

## 1. Comparativo de Acoplamento

| Dimensao | Antes | Depois | Variação |
|---|---|---|---|
| **Camada de Servico (Service Layer)** | Inexistente (0 classes) | `TarefaService` (4 metodos) | +100% de isolamento de dominio |
| **Linhas de Regra Contabil no Model** | 20 linhas espalhadas em save/delete | 4 linhas de delegacao limpa | -80% de acoplamento nos models |
| **Capacidade de Recalculo Avulso/Lote** | Nenhuma (dependia de save() do model) | `TarefaService.recalcular_horas_ciclo(ciclo)` | Disponivel globalmente |

## 2. Estrutura do Novo Servico

```python
class TarefaService:
    @staticmethod
    def recalcular_horas_ciclo(ciclo) -> Decimal: ...

    @staticmethod
    def criar_tarefa(ciclo, descricao, horas_estimadas, horas_realizadas, status, operador) -> Tarefa: ...

    @staticmethod
    def atualizar_tarefa(tarefa: Tarefa, **campos) -> Tarefa: ...

    @staticmethod
    def remover_tarefa(tarefa: Tarefa) -> None: ...
```
