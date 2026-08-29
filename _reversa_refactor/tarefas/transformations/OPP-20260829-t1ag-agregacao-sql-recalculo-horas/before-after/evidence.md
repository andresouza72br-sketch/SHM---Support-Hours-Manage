# Evidencia de Otimizacao e Medicao - OPP-20260829-t1ag

## 1. Comparativo de Complexidade e Consumo

| Dimensao | Antes (Baseline) | Depois (Otimizado) |
|---|---|---|
| **Alocacao de Memoria** | $O(N)$ objetos Python instanciados na memoria | $O(1)$ resultado escalar unico agregado pelo DB |
| **Execucao do Somatorio** | Iteracao serial Python `sum(t.horas_realizadas...)` | Agregacao SQL nativa `SUM("horas_realizadas")` |
| **Garantia Transacional** | Mutacao nao-atomica sem lock | Execucao com bloco `with transaction.atomic():` |

## 2. Snippet Antes vs Depois

### Antes
```python
def save(self, *args, **kwargs):
    super().save(*args, **kwargs)
    total_realizadas = sum(t.horas_realizadas for t in self.ciclo.tarefas.filter(status=StatusTarefa.REALIZADA))
    self.ciclo.horas_realizadas = total_realizadas
    self.ciclo.save(update_fields=["horas_realizadas", "atualizado_em"])
```

### Depois
```python
def save(self, *args, **kwargs):
    with transaction.atomic():
        super().save(*args, **kwargs)
        total_realizadas = self.ciclo.tarefas.filter(
            status=StatusTarefa.REALIZADA
        ).aggregate(total=Coalesce(Sum("horas_realizadas"), Decimal("0.00")))["total"]
        self.ciclo.horas_realizadas = total_realizadas
        self.ciclo.save(update_fields=["horas_realizadas", "atualizado_em"])
```
