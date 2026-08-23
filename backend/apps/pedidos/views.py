from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.pedidos.models import Pedido, StatusPedido
from apps.pedidos.serializers import PedidoListSerializer, PedidoDetailSerializer
from apps.pedidos.services import PedidoService

class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.select_related("cliente", "contrato", "criado_por").prefetch_related("ciclos", "anexos").all()

    def get_serializer_class(self):
        if self.action in ("retrieve", "create", "update", "partial_update"):
            return PedidoDetailSerializer
        return PedidoListSerializer

    def perform_create(self, serializer):
        protocolo = PedidoService.gerar_protocolo()
        serializer.save(
            protocolo=protocolo,
            criado_por=self.request.user,
            cliente=self.request.user.cliente if self.request.user.is_cliente else serializer.validated_data["cliente"]
        )

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        contrato_id = self.request.query_params.get("contrato")
        if contrato_id:
            qs = qs.filter(contrato_id=contrato_id)
        if user.is_empresa:
            return qs
        if user.cliente_id:
            return qs.filter(cliente_id=user.cliente_id)
        return qs.none()

    @action(detail=False, methods=["get"])
    def kanban(self, request):
        qs = self.get_queryset()
        kanban_data = {
            "aberto": [],
            "em_orcamento": [],
            "aguardando_aprovacao": [],
            "em_execucao": [],
            "aguardando_aceite": [],
            "concluido": [],
        }
        for pedido in qs:
            serializer = PedidoListSerializer(pedido)
            st = pedido.status
            if st in kanban_data:
                kanban_data[st].append(serializer.data)
        return Response(kanban_data)