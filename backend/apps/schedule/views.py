import logging
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.models import UserRole
from apps.core.utils import get_client_ip, get_client_user_agent
from apps.schedule.models import Agendamento, StatusAgendamento
from apps.schedule.serializers import (
    AgendamentoListSerializer,
    AgendamentoDetailSerializer,
    CriarAgendamentoSerializer,
)
from apps.schedule.services import ScheduleService

logger = logging.getLogger(__name__)

class AgendamentoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Agendamento.objects.select_related(
            "cliente", "pedido", "ciclo", "organizador"
        ).prefetch_related("participantes", "lembretes")

        # Isolamento estrito de Multi-Tenant para Clientes
        is_empresa = getattr(user, "is_empresa", False) or user.role in (
            UserRole.EMPRESA_ADMIN,
            UserRole.EMPRESA_TECNICO,
        )
        if not is_empresa:
            if not user.cliente:
                return qs.none()
            qs = qs.filter(cliente=user.cliente)
        else:
            # Filtro opcional por cliente para técnicos/admins
            cliente_id = self.request.query_params.get("cliente")
            if cliente_id:
                qs = qs.filter(cliente_id=cliente_id)

        # Filtros operacionais
        pedido_id = self.request.query_params.get("pedido")
        if pedido_id:
            qs = qs.filter(pedido_id=pedido_id)

        ciclo_id = self.request.query_params.get("ciclo")
        if ciclo_id:
            qs = qs.filter(ciclo_id=ciclo_id)

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        tipo_param = self.request.query_params.get("tipo")
        if tipo_param:
            qs = qs.filter(tipo=tipo_param)

        data_inicio_apos = self.request.query_params.get("data_inicio_apos")
        if data_inicio_apos:
            qs = qs.filter(data_inicio__gte=data_inicio_apos)

        data_inicio_antes = self.request.query_params.get("data_inicio_antes")
        if data_inicio_antes:
            qs = qs.filter(data_inicio__lte=data_inicio_antes)

        return qs.order_by("data_inicio")

    def get_serializer_class(self):
        if self.action in ["retrieve", "cancelar"]:
            return AgendamentoDetailSerializer
        return AgendamentoListSerializer

    def create(self, request, *args, **kwargs):
        serializer = CriarAgendamentoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        is_empresa = getattr(user, "is_empresa", False) or user.role in (
            UserRole.EMPRESA_ADMIN,
            UserRole.EMPRESA_TECNICO,
        )

        # Se for cliente, obrigatoriamente vincula ao seu próprio cliente
        if not is_empresa:
            if not user.cliente or data["cliente"] != user.cliente:
                raise PermissionDenied("Você só pode criar agendamentos para a sua própria empresa.")

        ip_origem = get_client_ip(request)
        user_agent = get_client_user_agent(request)

        agendamento = ScheduleService.criar_agendamento(
            cliente=data["cliente"],
            organizador=user,
            titulo=data["titulo"],
            data_inicio=data["data_inicio"],
            data_fim=data.get("data_fim"),
            duracao_minutos=data.get("duracao_minutos", 45),
            descricao=data.get("descricao", ""),
            tipo=data.get("tipo"),
            pedido=data.get("pedido"),
            ciclo=data.get("ciclo"),
            tarefa=data.get("tarefa"),
            participantes=data.get("participantes", []),
            sincronizar_google=data.get("sincronizar_google", True),
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        out_serializer = AgendamentoDetailSerializer(agendamento)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        agendamento = self.get_object()
        user = request.user
        is_empresa = getattr(user, "is_empresa", False) or user.role in (
            UserRole.EMPRESA_ADMIN,
            UserRole.EMPRESA_TECNICO,
        )

        # Apenas empresa ou o organizador pode alterar
        if not is_empresa and agendamento.organizador != user:
            raise PermissionDenied("Apenas a equipe de suporte ou o organizador pode alterar este agendamento.")

        ip_origem = get_client_ip(request)
        user_agent = get_client_user_agent(request)

        agendamento = ScheduleService.atualizar_agendamento(
            agendamento=agendamento,
            titulo=request.data.get("titulo"),
            descricao=request.data.get("descricao"),
            data_inicio=request.data.get("data_inicio"),
            data_fim=request.data.get("data_fim"),
            duracao_minutos=request.data.get("duracao_minutos"),
            autor=user,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )
        return Response(AgendamentoDetailSerializer(agendamento).data)

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        agendamento = self.get_object()
        motivo = request.data.get("motivo", "")
        ip_origem = get_client_ip(request)
        user_agent = get_client_user_agent(request)
        agendamento = ScheduleService.cancelar_agendamento(
            agendamento=agendamento,
            motivo=motivo,
            autor=request.user,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )
        return Response(AgendamentoDetailSerializer(agendamento).data)

    @action(detail=False, methods=["get"])
    def proxima(self, request):
        now = timezone.now()
        proxima = self.get_queryset().filter(
            status=StatusAgendamento.AGENDADO,
            data_fim__gte=now,
        ).order_by("data_inicio").first()

        if not proxima:
            return Response(None, status=status.HTTP_200_OK)

        return Response(AgendamentoDetailSerializer(proxima).data)
