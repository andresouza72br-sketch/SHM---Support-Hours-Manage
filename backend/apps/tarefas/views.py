from rest_framework import viewsets, permissions
from apps.tarefas.models import Tarefa
from apps.tarefas.serializers import TarefaSerializer
from apps.core.permissions import IsEmpresaUser

class TarefaViewSet(viewsets.ModelViewSet):
    queryset = Tarefa.objects.select_related("ciclo", "operador").all()
    serializer_class = TarefaSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsEmpresaUser()]
        return [permissions.IsAuthenticated()]