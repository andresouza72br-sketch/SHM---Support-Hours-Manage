import logging
from rest_framework import viewsets, permissions
from apps.tarefas.models import Tarefa
from apps.tarefas.serializers import TarefaSerializer
from apps.core.permissions import IsEmpresaUser

logger = logging.getLogger(__name__)

class TarefaViewSet(viewsets.ModelViewSet):
    queryset = Tarefa.objects.select_related("ciclo", "operador").all()
    serializer_class = TarefaSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsEmpresaUser()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        tarefa = serializer.save()
        logger.info(
            "API Tarefa criada: id=%s no ciclo=%s pelo usuario=%s",
            tarefa.id,
            tarefa.ciclo_id,
            self.request.user.username if self.request.user.is_authenticated else "anon",
        )

    def perform_destroy(self, instance):
        tarefa_id = instance.id
        ciclo_id = instance.ciclo_id
        super().perform_destroy(instance)
        logger.info(
            "API Tarefa removida: id=%s do ciclo=%s pelo usuario=%s",
            tarefa_id,
            ciclo_id,
            self.request.user.username if self.request.user.is_authenticated else "anon",
        )