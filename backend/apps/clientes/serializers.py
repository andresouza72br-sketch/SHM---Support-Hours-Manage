from rest_framework import serializers
from apps.clientes.models import Cliente

class ClienteSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = "__all__"

    def get_display_name(self, obj):
        return str(obj)

    def get_logo_url(self, obj):
        if obj.logo and hasattr(obj.logo, "url"):
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None