from rest_framework import serializers
from apps.ciclos.models import Ciclo, AvaliacaoCiclo
from apps.tarefas.serializers import TarefaSerializer


class AvaliacaoCicloSerializer(serializers.ModelSerializer):
    avaliador_nome = serializers.CharField(source="avaliador.get_full_name", read_only=True)
    avaliador_empresa = serializers.CharField(source="avaliador.cliente.display_name", read_only=True)

    class Meta:
        model = AvaliacaoCiclo
        fields = ["id", "ciclo", "avaliador", "avaliador_nome", "avaliador_empresa", "nota", "comentario", "criado_em"]
        read_only_fields = ["id", "ciclo", "avaliador", "criado_em"]


class CicloSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    operador_nome = serializers.CharField(source="operador.get_full_name", read_only=True)
    tarefas = TarefaSerializer(many=True, read_only=True)
    avaliacao = AvaliacaoCicloSerializer(read_only=True)
    pedido_protocolo = serializers.CharField(source="pedido.protocolo", read_only=True)
    pedido_assunto = serializers.CharField(source="pedido.assunto", read_only=True)

    class Meta:
        model = Ciclo
        fields = "__all__"
        read_only_fields = ["id", "token_acesso", "criado_em", "atualizado_em"]