from rest_framework import serializers
from apps.contratos.models import Contrato, ContratoPDF, AceiteLink

class ContratoPDFSerializer(serializers.ModelSerializer):
    url = serializers.FileField(source="arquivo", read_only=True)

    class Meta:
        model = ContratoPDF
        fields = ["id", "nome_original", "url", "criado_em"]

class ContratoSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome_fantasia", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    em_carencia = serializers.BooleanField(read_only=True)
    saldo_devedor = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    saldo_remanescente = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    pdfs = ContratoPDFSerializer(many=True, read_only=True)

    class Meta:
        model = Contrato
        fields = "__all__"
        read_only_fields = ["id", "numero", "saldo", "horas_consumidas", "criado_em", "atualizado_em"]