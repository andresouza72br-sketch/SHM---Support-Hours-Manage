from rest_framework import serializers
from apps.clientes.models import Cliente

class ClienteSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = "__all__"

    def get_display_name(self, obj):
        return str(obj)