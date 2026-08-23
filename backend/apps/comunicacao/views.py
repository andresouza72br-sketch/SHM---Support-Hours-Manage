from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.comunicacao.models import Comentario
from apps.comunicacao.serializers import ComentarioSerializer
from apps.tarefas.models import Tarefa, StatusTarefa
from apps.core.permissions import IsEmpresaUser

class ComentarioViewSet(viewsets.ModelViewSet):
    queryset = Comentario.objects.select_related("autor", "ciclo", "tarefa").prefetch_related("anexos").all()
    serializer_class = ComentarioSerializer

    def perform_create(self, serializer):
        serializer.save(autor=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        ciclo_id = self.request.query_params.get("ciclo")
        if ciclo_id:
            qs = qs.filter(ciclo_id=ciclo_id)
        tarefa_id = self.request.query_params.get("tarefa")
        if tarefa_id:
            qs = qs.filter(tarefa_id=tarefa_id)
        return qs

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaUser])
    def converter_em_tarefa(self, request, pk=None):
        comentario = self.get_object()
        if not comentario.ciclo:
            return Response({"detail": "Comentário deve estar vinculado a um ciclo."}, status=status.HTTP_400_BAD_REQUEST)
        
        horas_estimadas = Decimal(str(request.data.get("horas_estimadas", "1.00")))
        descricao = request.data.get("descricao") or comentario.texto
        
        tarefa = Tarefa.objects.create(
            ciclo=comentario.ciclo,
            descricao=descricao,
            horas_estimadas=horas_estimadas,
            status=StatusTarefa.PREVISTA,
            operador=request.user,
        )
        comentario.tarefa_convertida = tarefa
        comentario.save(update_fields=["tarefa_convertida", "atualizado_em"])

        return Response({"detail": "Comentário convertido em tarefa com sucesso.", "tarefa_id": tarefa.id})