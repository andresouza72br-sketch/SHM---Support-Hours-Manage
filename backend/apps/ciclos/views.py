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
from apps.ciclos.services import CicloService
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

    @action(detail=True, methods=["post"], permission_classes=[IsClienteGerente])
    def aceitar(self, request, pk=None):
        ciclo = self.get_object()
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        ciclo = CicloService.aceitar_ciclo(ciclo, request.user, ip_origem=ip, user_agent=ua, metodo="APP")
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsClienteGerente])
    def recusar(self, request, pk=None):
        ciclo = self.get_object()
        justificativa = request.data.get("justificativa", "")
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        ciclo = CicloService.recusar_aceite(ciclo, justificativa, usuario=request.user, ip_origem=ip, user_agent=ua)
        return Response(self.get_serializer(ciclo).data)

class MagicLinkCicloView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def _get_magic_link_or_fallback(self, token):
        from django.db.models import Q
        token_str = str(token).strip()
        token_uuid = None
        try:
            token_uuid = uuid.UUID(token_str)
        except (ValueError, TypeError):
            pass

        # 1. Busca no modelo CicloMagicLink
        q_magic = Q(token=token_str)
        if token_uuid:
            q_magic |= Q(token=token_uuid) | Q(token=token_uuid.hex) | Q(token=str(token_uuid))

        magic_link = CicloMagicLink.objects.select_related(
            "ciclo__pedido__cliente",
            "ciclo__pedido__contrato",
            "ciclo__operador",
        ).prefetch_related("ciclo__tarefas").filter(q_magic).first()

        if magic_link:
            return magic_link

        # 2. Retrocompatibilidade com token_acesso legado no Ciclo
        q_ciclo = Q(token_acesso=token_str)
        if token_uuid:
            q_ciclo |= Q(token_acesso=token_uuid) | Q(token_acesso=token_uuid.hex) | Q(token_acesso=str(token_uuid))

        ciclo = Ciclo.objects.select_related(
            "pedido__cliente",
            "pedido__contrato",
            "operador",
        ).prefetch_related("tarefas").filter(q_ciclo).first()

        if ciclo:
            tipo_acao = (
                TipoAcaoMagicLink.APROVACAO_ORCAMENTO
                if ciclo.status in [StatusCiclo.ORCADO, StatusCiclo.AGUARDANDO_APROVACAO, StatusCiclo.APROVADO]
                else TipoAcaoMagicLink.ACEITE_CICLO
            )
            # Cria registro retrocompatível com validade de 7 dias
            magic_link = CicloMagicLink.objects.create(
                ciclo=ciclo,
                tipo_acao=tipo_acao,
                token=ciclo.token_acesso,
                expira_em=timezone.now() + timedelta(days=7),
                usado=(ciclo.status in [StatusCiclo.APROVADO, StatusCiclo.EM_EXECUCAO, StatusCiclo.ACEITO]),
                usado_em=ciclo.aprovado_em or ciclo.aceito_em,
            )
            return magic_link

        return None

    def get(self, request, token):
        magic_link = self._get_magic_link_or_fallback(token)
        if not magic_link:
            return Response({"detail": "Token inválido ou não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        ciclo = magic_link.ciclo
        expirado = timezone.now() > magic_link.expira_em
        serializer = CicloSerializer(ciclo)

        contrato = ciclo.pedido.contrato
        contrato_num = contrato.numero if contrato else "Contrato Vinculado"
        cliente_nome = ciclo.pedido.cliente.nome_fantasia if (ciclo.pedido.cliente and ciclo.pedido.cliente.nome_fantasia) else (
            ciclo.pedido.cliente.razao_social if (ciclo.pedido.cliente and ciclo.pedido.cliente.razao_social) else "Cliente"
        )
        saldo_atual = float(contrato.saldo) if contrato else 0.0

        return Response({
            "ciclo": serializer.data,
            "pedido_protocolo": ciclo.pedido.protocolo,
            "pedido_assunto": ciclo.pedido.assunto,
            "cliente_nome": cliente_nome,
            "contrato_numero": contrato_num,
            "contrato_saldo": saldo_atual,
            "tipo_acao": magic_link.tipo_acao,
            "expirado": expirado,
            "expira_em": magic_link.expira_em.isoformat(),
            "usado": magic_link.usado,
            "usado_em": magic_link.usado_em.isoformat() if magic_link.usado_em else None,
        })

    def post(self, request, token):
        magic_link = self._get_magic_link_or_fallback(token)
        if not magic_link:
            return Response({"detail": "Token inválido."}, status=status.HTTP_404_NOT_FOUND)

        acao = request.data.get("acao")
        user = request.user if (hasattr(request.user, "is_authenticated") and request.user.is_authenticated) else None
        ip_origem = get_client_ip(request)
        user_agent = get_client_user_agent(request)
        ciclo = magic_link.ciclo
        pedido = ciclo.pedido
        contrato = pedido.contrato
        contrato_num = contrato.numero if contrato else "Contrato Vinculado"
        cliente_nome = pedido.cliente.nome_fantasia if (pedido.cliente and pedido.cliente.nome_fantasia) else (
            pedido.cliente.razao_social if (pedido.cliente and pedido.cliente.razao_social) else "Cliente"
        )

        # Regra de negócio: Rejeição ou Recusa é ESTRITAMENTE via App/Plataforma com justificativa
        if acao in ["rejeitar", "recusar"]:
            return Response(
                {
                    "detail": "Operação não permitida via Magic Link. A recusa com justificativa técnica deve ser realizada exclusivamente via app/plataforma."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Regra de negócio: Idempotência e Uso Único (Single-Use)
        if magic_link.usado:
            data_formatada = magic_link.usado_em.strftime("%d/%m/%Y às %H:%M") if magic_link.usado_em else "data anterior"
            return Response(
                {"detail": f"Este link seguro de uso único já foi consumido em {data_formatada}."},
                status=status.HTTP_409_CONFLICT,
            )

        # Regra de negócio: Validade de 7 dias
        if timezone.now() > magic_link.expira_em:
            data_expira = magic_link.expira_em.strftime("%d/%m/%Y às %H:%M")
            return Response(
                {"detail": f"Este link seguro expirou em {data_expira} (validade de 7 dias). Solicite um novo link ou acesse o app."},
                status=status.HTTP_410_GONE,
            )

        # Processamento das ações válidas
        if acao == "aprovar":
            CicloService.aprovar_orcamento(
                ciclo=ciclo,
                usuario=user,
                ip_origem=ip_origem,
                user_agent=user_agent,
                metodo="MAGIC_LINK",
            )
            msg = f"Orçamento de {float(ciclo.horas_estimadas):.1f}h do Pedido {pedido.protocolo} ({cliente_nome} / Contrato {contrato_num}) aprovado com sucesso via Magic Link."
        elif acao == "aceitar":
            CicloService.aceitar_ciclo(
                ciclo=ciclo,
                usuario=user,
                ip_origem=ip_origem,
                user_agent=user_agent,
                metodo="MAGIC_LINK",
            )
            if contrato:
                contrato.refresh_from_db()
                saldo_restante = float(contrato.saldo)
            else:
                saldo_restante = 0.0
            msg = f"Aceite final concedido com sucesso! Foram debitadas {float(ciclo.horas_realizadas):.1f}h do Contrato {contrato_num} da empresa {cliente_nome}. Saldo restante: {saldo_restante:.1f}h."
        else:
            return Response({"detail": "Ação inválida para o Magic Link."}, status=status.HTTP_400_BAD_REQUEST)

        # Marca token como consumido (Single-Use)
        magic_link.usado = True
        magic_link.usado_em = timezone.now()
        magic_link.usado_ip = ip_origem
        magic_link.usado_user_agent = user_agent
        magic_link.save(update_fields=["usado", "usado_em", "usado_ip", "usado_user_agent", "atualizado_em"])

        return Response({
            "detail": msg,
            "contrato_numero": contrato_num,
            "cliente_nome": cliente_nome,
            "usado_em": magic_link.usado_em.isoformat(),
            "ip_origem": ip_origem,
            "metodo": "MAGIC_LINK",
        })