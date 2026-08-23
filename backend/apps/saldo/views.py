from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.saldo.models import HistoricoSaldo
from apps.saldo.serializers import HistoricoSaldoSerializer
from apps.saldo.services import SaldoService
from apps.core.permissions import IsEmpresaAdmin

class SaldoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistoricoSaldo.objects.select_related("contrato", "autor", "pedido", "ciclo").all()
    serializer_class = HistoricoSaldoSerializer

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        contrato_id = self.request.query_params.get("contrato")
        if contrato_id:
            qs = qs.filter(contrato_id=contrato_id)
        if user.is_empresa:
            return qs
        if user.cliente_id:
            return qs.filter(contrato__cliente_id=user.cliente_id)
        return qs.none()

    @action(detail=False, methods=["post"], permission_classes=[IsEmpresaAdmin])
    def transferir(self, request):
        origem = request.data.get("contrato_origem")
        destino = request.data.get("contrato_destino")
        quantidade = Decimal(str(request.data.get("quantidade", 0)))
        motivo = request.data.get("motivo", "")
        transf = SaldoService.transferir(origem, destino, quantidade, request.user, motivo)
        return Response({"detail": "Transferência realizada com sucesso.", "id": transf.id})

    @action(detail=False, methods=["post"], permission_classes=[IsEmpresaAdmin])
    def reabastecer(self, request):
        contrato_id = request.data.get("contrato")
        quantidade = Decimal(str(request.data.get("quantidade", 0)))
        motivo = request.data.get("motivo", "")
        reab = SaldoService.reabastecer(contrato_id, quantidade, request.user, motivo)
        return Response({"detail": "Reabastecimento realizado com sucesso.", "id": reab.id})