from rest_framework import serializers
from apps.comunicacao.models import Comentario, AnexoComentario

class AnexoComentarioSerializer(serializers.ModelSerializer):
    url = serializers.FileField(source="arquivo", read_only=True)

    class Meta:
        model = AnexoComentario
        fields = ["id", "nome_original", "tamanho", "url", "criado_em"]

class ComentarioSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source="autor.get_full_name", read_only=True)
    autor_role = serializers.CharField(source="autor.get_role_display", read_only=True)
    autor_username = serializers.CharField(source="autor.username", read_only=True)
    anexos = AnexoComentarioSerializer(many=True, read_only=True)

    class Meta:
        model = Comentario
        fields = [
            "id",
            "ciclo",
            "tarefa",
            "autor",
            "autor_nome",
            "autor_role",
            "autor_username",
            "texto",
            "tarefa_convertida",
            "anexos",
            "criado_em",
            "atualizado_em",
        ]
        read_only_fields = ["id", "autor", "tarefa_convertida", "criado_em", "atualizado_em"]