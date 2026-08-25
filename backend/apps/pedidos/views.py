from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.pedidos.models import Pedido, StatusPedido
from apps.pedidos.serializers import PedidoListSerializer, PedidoDetailSerializer
from apps.pedidos.services import PedidoService

from django.db.models import Case, When, Value, IntegerField

STATUS_ORDER = Case(
    When(status="em_execucao", then=Value(1)),
    When(status="aberto", then=Value(2)),
    When(status="em_orcamento", then=Value(3)),
    When(status="aguardando_aprovacao", then=Value(4)),
    When(status="aguardando_aceite", then=Value(5)),
    When(status="concluido", then=Value(6)),
    When(status="cancelado", then=Value(7)),
    default=Value(8),
    output_field=IntegerField(),
)

PRIORITY_ORDER = Case(
    When(prioridade="urgente", then=Value(1)),
    When(prioridade="alta", then=Value(2)),
    When(prioridade="media", then=Value(3)),
    When(prioridade="baixa", then=Value(4)),
    default=Value(5),
    output_field=IntegerField(),
)

class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.select_related("cliente", "contrato", "criado_por").prefetch_related("ciclos", "anexos").all()

    def get_serializer_class(self):
        if self.action in ("retrieve", "create", "update", "partial_update"):
            return PedidoDetailSerializer
        return PedidoListSerializer

    def perform_create(self, serializer):
        protocolo = PedidoService.gerar_protocolo()
        user = self.request.user
        contrato = serializer.validated_data.get("contrato")
        cliente = user.cliente if (hasattr(user, "is_cliente") and user.is_cliente and user.cliente) else (contrato.cliente if contrato else None)
        pedido = serializer.save(
            protocolo=protocolo,
            criado_por=user,
            cliente=cliente,
        )
        try:
            from apps.notificacoes.services import NotificacaoService
            NotificacaoService.notificar_novo_pedido(pedido)
        except Exception:
            pass

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        contrato_params = self.request.query_params.getlist("contrato")
        if contrato_params:
            ids = []
            for item in contrato_params:
                for x in str(item).split(","):
                    if x.strip().isdigit():
                        ids.append(int(x.strip()))
            if ids:
                qs = qs.filter(contrato_id__in=ids)
        if user.is_empresa:
            return qs.annotate(
                status_order=STATUS_ORDER,
                priority_order=PRIORITY_ORDER,
            ).order_by("status_order", "priority_order", "-criado_em")
        if user.cliente_id:
            return qs.filter(cliente_id=user.cliente_id).annotate(
                status_order=STATUS_ORDER,
                priority_order=PRIORITY_ORDER,
            ).order_by("status_order", "priority_order", "-criado_em")
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