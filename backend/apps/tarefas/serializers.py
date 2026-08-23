from rest_framework import serializers
from apps.tarefas.models import Tarefa

class TarefaSerializer(serializers.ModelSerializer):
    operador_nome = serializers.CharField(source="operador.get_full_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Tarefa
        fields = "__all__"
        read_only_fields = ["id", "criado_em", "atualizado_em"]