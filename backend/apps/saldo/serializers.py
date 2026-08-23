from rest_framework import serializers
from apps.saldo.models import HistoricoSaldo, TransferenciaSaldo, Reabastecimento

class HistoricoSaldoSerializer(serializers.ModelSerializer):
    tipo_operacao_display = serializers.CharField(source="get_tipo_operacao_display", read_only=True)
    autor_nome = serializers.CharField(source="autor.get_full_name", read_only=True)
    contrato_numero = serializers.CharField(source="contrato.numero", read_only=True)

    class Meta:
        model = HistoricoSaldo
        fields = "__all__"