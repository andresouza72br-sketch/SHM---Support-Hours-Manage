from rest_framework import viewsets, permissions
from apps.clientes.models import Cliente
from apps.clientes.serializers import ClienteSerializer
from apps.core.permissions import IsEmpresaAdmin, IsEmpresaUser

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    
    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsEmpresaAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_empresa:
            return Cliente.objects.all()
        if user.cliente_id:
            return Cliente.objects.filter(id=user.cliente_id)
        return Cliente.objects.none()