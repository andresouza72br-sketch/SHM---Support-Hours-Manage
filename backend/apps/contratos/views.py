from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.contratos.models import Contrato
from apps.contratos.serializers import ContratoSerializer
from apps.contratos.services import ContratoService
from apps.core.permissions import IsEmpresaAdmin, IsEmpresaUser

class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.select_related("cliente", "criado_por").prefetch_related("pdfs").all()
    serializer_class = ContratoSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsEmpresaAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        contrato = ContratoService.criar_contrato(self.request.data, self.request.user)
        return contrato

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_empresa:
            return qs
        if user.cliente_id:
            return qs.filter(cliente_id=user.cliente_id)
        return qs.none()

    @action(detail=True, methods=["get"])
    def extrato(self, request, pk=None):
        contrato = self.get_object()
        serializer = self.get_serializer(contrato)
        # Resumo de histórico de ciclos aceitos vinculados
        from apps.ciclos.models import Ciclo, StatusCiclo
        ciclos_aceitos = Ciclo.objects.filter(
            pedido__contrato=contrato,
            status=StatusCiclo.ACEITO
        ).select_related("pedido").order_by("-aceito_em")
        
        ciclos_data = [
            {
                "id": c.id,
                "pedido_protocolo": c.pedido.protocolo,
                "tipo": c.get_tipo_display(),
                "contexto": c.contexto,
                "horas_realizadas": float(c.horas_realizadas),
                "aceito_em": c.aceito_em,
            }
            for c in ciclos_aceitos
        ]

        return Response({
            "contrato": serializer.data,
            "historico_ciclos": ciclos_data,
        })