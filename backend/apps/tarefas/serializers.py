from decimal import Decimal
from rest_framework import serializers
from apps.tarefas.models import Tarefa

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