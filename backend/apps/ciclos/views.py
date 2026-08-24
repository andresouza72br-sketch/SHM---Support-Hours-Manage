from decimal import Decimal
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.ciclos.models import Ciclo
from apps.ciclos.serializers import CicloSerializer
from apps.ciclos.services import CicloService
from apps.core.permissions import IsEmpresaUser, IsClienteGerente

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
        ciclo = CicloService.apresentar_orcamento(ciclo, horas)
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsClienteGerente])
    def aprovar(self, request, pk=None):
        ciclo = self.get_object()
        ciclo = CicloService.aprovar_orcamento(ciclo, request.user)
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsClienteGerente])
    def rejeitar(self, request, pk=None):
        ciclo = self.get_object()
        justificativa = request.data.get("justificativa", "")
        ciclo = CicloService.rejeitar_orcamento(ciclo, justificativa)
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaUser])
    def iniciar_execucao(self, request, pk=None):
        ciclo = self.get_object()
        ciclo = CicloService.iniciar_execucao(ciclo)
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaUser])
    def solicitar_aceite(self, request, pk=None):
        ciclo = self.get_object()
        ciclo = CicloService.solicitar_aceite(ciclo)
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsClienteGerente])
    def aceitar(self, request, pk=None):
        ciclo = self.get_object()
        ciclo = CicloService.aceitar_ciclo(ciclo, request.user)
        return Response(self.get_serializer(ciclo).data)

    @action(detail=True, methods=["post"], permission_classes=[IsClienteGerente])
    def recusar(self, request, pk=None):
        ciclo = self.get_object()
        justificativa = request.data.get("justificativa", "")
        ciclo = CicloService.recusar_aceite(ciclo, justificativa)
        return Response(self.get_serializer(ciclo).data)

class MagicLinkCicloView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            ciclo = Ciclo.objects.select_related("pedido__cliente", "pedido__contrato", "operador").prefetch_related("tarefas").get(token_acesso=token)
        except Ciclo.DoesNotExist:
            return Response({"detail": "Token inválido ou não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = CicloSerializer(ciclo)
        return Response({
            "ciclo": serializer.data,
            "pedido_protocolo": ciclo.pedido.protocolo,
            "pedido_assunto": ciclo.pedido.assunto,
            "cliente_nome": str(ciclo.pedido.cliente),
        })

    def post(self, request, token):
        try:
            ciclo = Ciclo.objects.get(token_acesso=token)
        except Ciclo.DoesNotExist:
            return Response({"detail": "Token inválido."}, status=status.HTTP_404_NOT_FOUND)
        
        acao = request.data.get("acao")
        justificativa = request.data.get("justificativa", "")

        if acao == "aprovar":
            CicloService.aprovar_orcamento(ciclo, request.user)
        elif acao == "rejeitar":
            CicloService.rejeitar_orcamento(ciclo, justificativa)
        elif acao == "aceitar":
            CicloService.aceitar_ciclo(ciclo, request.user)
        elif acao == "recusar":
            CicloService.recusar_aceite(ciclo, justificativa)
        else:
            return Response({"detail": "Ação inválida."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": f"Ação '{acao}' processada com sucesso."})