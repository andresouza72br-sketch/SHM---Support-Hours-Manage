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
    anexos = AnexoComentarioSerializer(many=True, read_only=True)

    class Meta:
        model = Comentario
        fields = "__all__"
        read_only_fields = ["id", "autor", "criado_em", "atualizado_em"]