# Evidencia de Simplificacao e Validacao - OPP-20260829-t3sp

## 1. Comparativo de Robustez

| Dimensao | Antes | Depois | Variação |
|---|---|---|---|
| **Validacao de Horas Negativas** | Inexistente (aceitava qualquer decimal) | `min_value=Decimal("0.00")` | Protecao declarativa |
| **Sanitizacao de Descricao** | Aceitava espacos em branco | `validate_descricao` com `strip()` | Protecao contra campos nulos disfarcados |

## 2. Snippet do Serializer Simplificado

```python
class TarefaSerializer(serializers.ModelSerializer):
    operador_nome = serializers.CharField(source="operador.get_full_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    horas_estimadas = serializers.DecimalField(
        max_digits=8, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("0.00")
    )
    horas_realizadas = serializers.DecimalField(
        max_digits=8, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("0.00")
    )

    class Meta:
        model = Tarefa
        fields = "__all__"
        read_only_fields = ["id", "criado_em", "atualizado_em"]

    def validate_descricao(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("A descrição da tarefa não pode ser vazia.")
        return value.strip()
```
