from rest_framework import serializers
from apps.notificacoes.models import Notification, TimelineEvent, ConfiguracaoNotificacao

class TimelineEventSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source="autor.get_full_name", read_only=True)
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = TimelineEvent
        fields = "__all__"

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["id", "criado_em", "atualizado_em"]


class ConfiguracaoNotificacaoSerializer(serializers.ModelSerializer):
    categoria_display = serializers.CharField(source="get_categoria_display", read_only=True)

    class Meta:
        model = ConfiguracaoNotificacao
        fields = [
            "id",
            "codigo",
            "categoria",
            "categoria_display",
            "nome",
            "descricao",
            "ativo_email",
            "ativo_in_app",
            "notificar_empresa_admin",
            "notificar_empresa_tecnico",
            "notificar_cliente_gerente",
            "notificar_cliente_comum",
            "notificar_gestor_contrato",
            "notificar_emails_cc",
            "emails_adicionais",
            "bloqueado_edicao",
            "criado_em",
            "atualizado_em",
        ]
        read_only_fields = ["id", "codigo", "categoria", "categoria_display", "nome", "descricao", "bloqueado_edicao", "criado_em", "atualizado_em"]

    def validate(self, attrs):
        if self.instance and self.instance.bloqueado_edicao:
            if "ativo_email" in attrs and attrs["ativo_email"] is False:
                raise serializers.ValidationError(
                    {"detail": "Este evento é essencial para o funcionamento do sistema e o envio de e-mail não pode ser desativado."}
                )
        return attrs