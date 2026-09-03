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


class BaseComentarioSerializer(serializers.ModelSerializer):
    """Base serializer encapsulando dados do autor, anexos e cálculo de reações em memória (O(1))."""

    autor_nome = serializers.CharField(source="autor.get_full_name", read_only=True)
    autor_role = serializers.CharField(source="autor.get_role_display", read_only=True)
    autor_username = serializers.CharField(source="autor.username", read_only=True)
    autor_avatar_url = serializers.CharField(source="autor.avatar_url", read_only=True)
    anexos = AnexoComentarioSerializer(many=True, read_only=True)
    reacoes_count = serializers.SerializerMethodField()
    user_reacted = serializers.SerializerMethodField()

    def get_reacoes_count(self, obj):
        if hasattr(obj, "_prefetched_objects_cache") and "reacoes" in obj._prefetched_objects_cache:
            return len(obj.reacoes.all())
        return obj.reacoes.count()

    def get_user_reacted(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not (user and getattr(user, "is_authenticated", False)):
            return False
        user_id = getattr(user, "id", None)
        if hasattr(obj, "_prefetched_objects_cache") and "reacoes" in obj._prefetched_objects_cache:
            return any(r.autor_id == user_id and r.tipo == "like" for r in obj.reacoes.all())
        return obj.reacoes.filter(autor_id=user_id, tipo="like").exists()


class RespostaComentarioSerializer(BaseComentarioSerializer):
    """Serializer flat para respostas (1 nível), sem aninhamento recursivo."""

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


class ComentarioSerializer(BaseComentarioSerializer):
    respostas = RespostaComentarioSerializer(many=True, read_only=True)

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