from rest_framework import serializers
from apps.comunicacao.models import Comentario, AnexoComentario, ReacaoComentario


class AnexoComentarioSerializer(serializers.ModelSerializer):
    url = serializers.FileField(source="arquivo", read_only=True)

    class Meta:
        model = AnexoComentario
        fields = ["id", "nome_original", "tamanho", "url", "criado_em"]


class ReacaoComentarioSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source="autor.get_full_name", read_only=True)

    class Meta:
        model = ReacaoComentario
        fields = ["id", "tipo", "autor", "autor_nome", "criado_em"]
        read_only_fields = ["id", "autor", "criado_em"]


class RespostaComentarioSerializer(serializers.ModelSerializer):
    """Serializer flat para respostas (1 nível), sem aninhamento recursivo."""

    autor_nome = serializers.CharField(source="autor.get_full_name", read_only=True)
    autor_role = serializers.CharField(source="autor.get_role_display", read_only=True)
    autor_username = serializers.CharField(source="autor.username", read_only=True)
    autor_avatar_url = serializers.CharField(source="autor.avatar_url", read_only=True)
    reacoes_count = serializers.SerializerMethodField()
    user_reacted = serializers.SerializerMethodField()
    anexos = AnexoComentarioSerializer(many=True, read_only=True)

    class Meta:
        model = Comentario
        fields = [
            "id", "ciclo", "tarefa", "parent",
            "autor", "autor_nome", "autor_role", "autor_username", "autor_avatar_url",
            "texto", "tarefa_convertida", "anexos",
            "reacoes_count", "user_reacted",
            "criado_em", "atualizado_em",
        ]
        read_only_fields = ["id", "autor", "tarefa_convertida", "criado_em", "atualizado_em"]

    def get_reacoes_count(self, obj):
        return obj.reacoes.count()

    def get_user_reacted(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return obj.reacoes.filter(autor=request.user, tipo="like").exists()
        return False


class ComentarioSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source="autor.get_full_name", read_only=True)
    autor_role = serializers.CharField(source="autor.get_role_display", read_only=True)
    autor_username = serializers.CharField(source="autor.username", read_only=True)
    autor_avatar_url = serializers.CharField(source="autor.avatar_url", read_only=True)
    anexos = AnexoComentarioSerializer(many=True, read_only=True)
    respostas = RespostaComentarioSerializer(many=True, read_only=True)
    reacoes_count = serializers.SerializerMethodField()
    user_reacted = serializers.SerializerMethodField()

    class Meta:
        model = Comentario
        fields = [
            "id", "ciclo", "tarefa", "parent",
            "autor", "autor_nome", "autor_role", "autor_username", "autor_avatar_url",
            "texto", "tarefa_convertida", "anexos", "respostas",
            "reacoes_count", "user_reacted",
            "criado_em", "atualizado_em",
        ]
        read_only_fields = ["id", "autor", "tarefa_convertida", "criado_em", "atualizado_em"]

    def get_reacoes_count(self, obj):
        return obj.reacoes.count()

    def get_user_reacted(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return obj.reacoes.filter(autor=request.user, tipo="like").exists()
        return False