from rest_framework import serializers
from apps.pedidos.models import Pedido, AnexoPedido

class AnexoPedidoSerializer(serializers.ModelSerializer):
    url = serializers.FileField(source="arquivo", read_only=True)

    class Meta:
        model = AnexoPedido
        fields = ["id", "nome_original", "tamanho", "url", "criado_em"]

class PedidoListSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome_fantasia", read_only=True)
    contrato_numero = serializers.CharField(source="contrato.numero", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    prioridade_display = serializers.CharField(source="get_prioridade_display", read_only=True)
    ciclos_resumo = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = [
            "id",
            "protocolo",
            "assunto",
            "descricao",
            "prioridade",
            "prioridade_display",
            "status",
            "status_display",
            "cliente",
            "cliente_nome",
            "contrato",
            "contrato_numero",
            "criado_em",
            "ciclos_resumo",
        ]

    def get_ciclos_resumo(self, obj):
        return [
            {
                "id": c.id,
                "tipo": c.get_tipo_display(),
                "status": c.status,
                "status_display": c.get_status_display(),
                "horas_estimadas": float(c.horas_estimadas),
                "horas_realizadas": float(c.horas_realizadas),
            }
            for c in obj.ciclos.all()
        ]

class PedidoDetailSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome_fantasia", read_only=True)
    contrato_numero = serializers.CharField(source="contrato.numero", read_only=True)
    contrato_saldo = serializers.DecimalField(source="contrato.saldo", max_digits=10, decimal_places=2, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    prioridade_display = serializers.CharField(source="get_prioridade_display", read_only=True)
    anexos = AnexoPedidoSerializer(many=True, read_only=True)
    ciclos = serializers.SerializerMethodField()
    criado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = "__all__"
        read_only_fields = ["id", "protocolo", "status", "cliente", "criado_por", "criado_em", "atualizado_em"]

    def get_criado_por_nome(self, obj):
        return obj.criado_por.get_full_name() or obj.criado_por.username if obj.criado_por else "Usuário Desconhecido"

    def get_ciclos(self, obj):
        from apps.ciclos.serializers import CicloSerializer
        return CicloSerializer(obj.ciclos.all(), many=True).data