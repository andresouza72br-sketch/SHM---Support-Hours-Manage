from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
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
        serializer.instance = contrato
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

class AceiteContratoView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        from django.utils import timezone
        from apps.contratos.models import AceiteLink

        link = AceiteLink.objects.select_related("contrato__cliente").filter(token=token).first()
        if not link:
            return Response({"detail": "Token de aceite não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        contrato = link.contrato
        expirado = timezone.now() > link.data_expiracao
        serializer = ContratoSerializer(contrato)

        return Response({
            "contrato": serializer.data,
            "cliente_nome": str(contrato.cliente),
            "expirado": expirado,
            "expira_em": link.data_expiracao.isoformat(),
            "usado": link.usado,
            "usado_em": link.usado_em.isoformat() if link.usado_em else None,
        })

    def post(self, request, token):
        from django.utils import timezone
        from apps.contratos.models import AceiteLink, StatusContrato
        from apps.core.utils import get_client_ip, get_client_user_agent

        link = AceiteLink.objects.select_related("contrato").filter(token=token).first()
        if not link:
            return Response({"detail": "Token de aceite não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if link.usado:
            data_formatada = link.usado_em.strftime("%d/%m/%Y às %H:%M") if link.usado_em else "data anterior"
            return Response(
                {"detail": f"Este contrato já teve o seu aceite formalizado em {data_formatada}."},
                status=status.HTTP_409_CONFLICT,
            )

        if timezone.now() > link.data_expiracao:
            data_expira = link.data_expiracao.strftime("%d/%m/%Y às %H:%M")
            return Response(
                {"detail": f"O prazo de aceite eletrônico deste contrato expirou em {data_expira} (validade de 30 dias)."},
                status=status.HTTP_410_GONE,
            )

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)

        # Marcação de uso único (Idempotência)
        link.usado = True
        link.usado_em = timezone.now()
        link.usado_ip = ip
        link.usado_user_agent = ua
        link.save(update_fields=["usado", "usado_em", "usado_ip", "usado_user_agent", "atualizado_em"])

        contrato = link.contrato
        contrato.status = StatusContrato.ATIVO
        contrato.data_aceite = timezone.now()
        contrato.save(update_fields=["status", "data_aceite", "atualizado_em"])

        return Response({
            "detail": f"Aceite do Contrato {contrato.numero} formalizado com sucesso!",
            "contrato_numero": contrato.numero,
            "data_aceite": contrato.data_aceite.isoformat(),
            "ip_origem": ip,
        })