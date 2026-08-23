from rest_framework import serializers
from apps.ciclos.models import Ciclo
from apps.tarefas.serializers import TarefaSerializer

class CicloSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    operador_nome = serializers.CharField(source="operador.get_full_name", read_only=True)
    tarefas = TarefaSerializer(many=True, read_only=True)

    class Meta:
        model = Ciclo
        fields = "__all__"
        read_only_fields = ["id", "token_acesso", "criado_em", "atualizado_em"]