from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.notificacoes.models import Notification, TimelineEvent
from apps.notificacoes.serializers import NotificationSerializer, TimelineEventSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(usuario=self.request.user)

    @action(detail=True, methods=["post"])
    def marcar_lida(self, request, pk=None):
        notif = self.get_object()
        notif.lida = True
        notif.save(update_fields=["lida", "atualizado_em"])
        return Response({"status": "lida"})

    @action(detail=False, methods=["post"])
    def marcar_todas_lidas(self, request):
        Notification.objects.filter(usuario=request.user, lida=False).update(lida=True)
        return Response({"status": "todas_lidas"})

class TimelineViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TimelineEventSerializer
    queryset = TimelineEvent.objects.select_related("autor", "pedido", "ciclo").all()

    def get_queryset(self):
        qs = super().get_queryset()
        pedido_id = self.request.query_params.get("pedido")
        if pedido_id:
            qs = qs.filter(pedido_id=pedido_id)
        return qs