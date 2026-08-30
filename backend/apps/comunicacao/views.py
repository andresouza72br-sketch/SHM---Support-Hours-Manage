from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.comunicacao.models import Comentario
from apps.comunicacao.serializers import ComentarioSerializer
from apps.comunicacao.services import ComentarioService
from apps.core.permissions import IsEmpresaUser


class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    Permissão que permite a qualquer usuário autenticado visualizar comentários,
    mas apenas o autor original do comentário pode editá-lo ou excluí-lo.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.autor_id == request.user.id


class ComentarioViewSet(viewsets.ModelViewSet):
    serializer_class = ComentarioSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Comentario.objects.select_related(
            "autor", "ciclo", "tarefa", "parent"
        ).prefetch_related(
            "anexos",
            "reacoes",
            "respostas__autor",
            "respostas__reacoes",
            "respostas__anexos",
        )
        ciclo_id = self.request.query_params.get("ciclo")
        if ciclo_id:
            qs = qs.filter(ciclo_id=ciclo_id)
        tarefa_id = self.request.query_params.get("tarefa")
        if tarefa_id:
            qs = qs.filter(tarefa_id=tarefa_id)
        # Por padrão, retorna apenas comentários raiz (sem parent) na listagem.
        # Respostas vêm nested dentro do parent.
        if self.action == "list" and not self.request.query_params.get("include_replies"):
            qs = qs.filter(parent__isnull=True)
        if not user.is_empresa and user.cliente_id:
            qs = qs.filter(ciclo__pedido__cliente_id=user.cliente_id)
        return qs.order_by("criado_em")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, serializer):
        ComentarioService.criar_comentario(serializer, self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def reagir(self, request, pk=None):
        """Toggle like em um comentário. Cria se não existe, deleta se já existe (idempotente)."""
        comentario = self.get_object()
        tipo = request.data.get("tipo", "like")
        acao, tipo, total_reacoes, user_reacted = ComentarioService.toggle_reacao(
            comentario=comentario,
            autor=request.user,
            tipo=tipo,
        )
        return Response({
            "acao": acao,
            "tipo": tipo,
            "reacoes_count": total_reacoes,
            "user_reacted": user_reacted,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaUser])
    def converter_em_tarefa(self, request, pk=None):
        comentario = self.get_object()
        if not comentario.ciclo:
            return Response({"detail": "Comentário deve estar vinculado a um ciclo."}, status=status.HTTP_400_BAD_REQUEST)

        tarefa = ComentarioService.converter_em_tarefa(
            comentario=comentario,
            operador=request.user,
            descricao=request.data.get("descricao"),
            horas_estimadas=request.data.get("horas_estimadas", "1.00"),
        )
        return Response({"detail": "Comentário convertido em tarefa com sucesso.", "tarefa_id": tarefa.id})