import uuid
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.ciclos.models import Ciclo, CicloMagicLink, TipoAcaoMagicLink, StatusCiclo
from apps.ciclos.serializers import CicloSerializer
from apps.ciclos.services import CicloService, CicloMagicLinkService
from apps.core.permissions import IsEmpresaUser, IsClienteGerente
from apps.core.utils import get_client_ip, get_client_user_agent

class CicloViewSet(viewsets.ModelViewSet):
    queryset = Ciclo.objects.select_related("pedido", "operador").prefetch_related("tarefas").all()
    serializer_class = CicloSerializer

    def perform_create(self, serializer):
        operador = serializer.validated_data.get("operador") or self.request.user
        ciclo = serializer.save(operador=operador)
        from apps.pedidos.services import PedidoService
        PedidoService.sincronizar_status_pedido(ciclo.pedido)

        # Agora, a emissão do orçamento para o cliente (apresentar_orcamento)
        # só ocorre mediante ação explícita (botão "Emitir Orçamento").

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaUser])
    def apresentar_orcamento(self, request, pk=None):
        ciclo = self.get_object()
        horas = Decimal(str(request.data.get("horas_estimadas", 0)))
        ciclo = CicloService.apresentar_orcamento(ciclo, horas, usuario=request.user)
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsClienteGerente])
    def aprovar(self, request, pk=None):
        ciclo = self.get_object()
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        ciclo = CicloService.aprovar_orcamento(ciclo, request.user, ip_origem=ip, user_agent=ua, metodo="APP")
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsClienteGerente])
    def rejeitar(self, request, pk=None):
        ciclo = self.get_object()
        justificativa = request.data.get("justificativa", "")
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        ciclo = CicloService.rejeitar_orcamento(ciclo, justificativa, usuario=request.user, ip_origem=ip, user_agent=ua)
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaUser])
    def iniciar_execucao(self, request, pk=None):
        ciclo = self.get_object()
        ciclo = CicloService.iniciar_execucao(ciclo, usuario=request.user)
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaUser])
    def solicitar_aceite(self, request, pk=None):
        ciclo = self.get_object()
        ciclo = CicloService.solicitar_aceite(ciclo, usuario=request.user)
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaUser])
    def reenviar_magic_link(self, request, pk=None):
        ciclo = self.get_object()
        try:
            ciclo, magic_link = CicloService.reenviar_magic_link(ciclo, usuario=request.user)
            return Response({
                "detail": f"Magic link de {ciclo.get_status_display().lower()} reenviado com sucesso por e-mail.",
                "magic_link_token": str(magic_link.token),
                "expira_em": magic_link.expira_em.isoformat(),
                "ciclo": self.get_serializer(ciclo).data,
            }, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"detail": str(e.message if hasattr(e, "message") else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], permission_classes=[IsClienteGerente])
    def aceitar(self, request, pk=None):
        ciclo = self.get_object()
        justificativa_excedente = request.data.get("justificativa_excedente", "")
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        try:
            ciclo = CicloService.aceitar_ciclo(
                ciclo,
                request.user,
                ip_origem=ip,
                user_agent=ua,
                metodo="APP",
                justificativa_excedente=justificativa_excedente,
            )
            return Response(self.get_serializer(ciclo).data)
        except ValidationError as e:
            return Response({"detail": str(e.message if hasattr(e, "message") else e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], permission_classes=[IsClienteGerente])
    def recusar(self, request, pk=None):
        ciclo = self.get_object()
        justificativa = request.data.get("justificativa", "")
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        ciclo = CicloService.recusar_aceite(ciclo, justificativa, usuario=request.user, ip_origem=ip, user_agent=ua)
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsClienteGerente])
    def avaliar(self, request, pk=None):
        """Cria ou atualiza a avaliação de satisfação do ciclo aceito (1–5 ⭐)."""
        from apps.ciclos.serializers import AvaliacaoCicloSerializer
        ciclo = self.get_object()
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        res = CicloService.registrar_avaliacao(
            ciclo=ciclo,
            nota=request.data.get("nota"),
            comentario=request.data.get("comentario", ""),
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
            via_magic_link=False,
        )
        if not res["sucesso"]:
            return Response({"detail": res["mensagem"]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(AvaliacaoCicloSerializer(res["avaliacao"]).data, status=status.HTTP_200_OK)


class MagicLinkCicloView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        magic_link = CicloMagicLinkService.resolver_magic_link(token)
        if not magic_link:
            return Response({"detail": "Token inválido ou não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        dados = CicloMagicLinkService.obter_dados_visualizacao(magic_link)
        serializer = CicloSerializer(dados["ciclo"])
        payload = {**dados, "ciclo": serializer.data}
        return Response(payload)

    def post(self, request, token):
        magic_link = CicloMagicLinkService.resolver_magic_link(token)
        if not magic_link:
            return Response({"detail": "Token inválido."}, status=status.HTTP_404_NOT_FOUND)

        acao = request.data.get("acao")
        user = request.user if (hasattr(request.user, "is_authenticated") and request.user.is_authenticated) else None
        ip_origem = get_client_ip(request)
        user_agent = get_client_user_agent(request)

        res = CicloMagicLinkService.processar_acao(
            magic_link=magic_link,
            acao=acao,
            dados=request.data,
            usuario=user,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )
        if not res["sucesso"]:
            return Response({"detail": res["mensagem"]}, status=res["status_code"])

        return Response(res["payload"], status=res["status_code"])