from decimal import Decimal
from django.db import models
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from apps.contratos.models import Contrato, StatusContrato
from apps.saldo.models import HistoricoSaldo
from apps.saldo.serializers import HistoricoSaldoSerializer
from apps.saldo.services import SaldoService
from apps.core.permissions import IsEmpresaAdmin
from apps.core.utils import get_client_ip, get_client_user_agent

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

    @action(detail=False, methods=["get"], permission_classes=[IsEmpresaAdmin])
    def contratos_elegiveis(self, request):
        cliente_id = request.query_params.get("cliente_id")
        destino_id = request.query_params.get("destino_id")
        if not cliente_id:
            raise ValidationError({"cliente_id": "Parâmetro obrigatório."})

        hoje = timezone.localdate()
        qs = Contrato.objects.filter(
            cliente_id=cliente_id,
            saldo__gt=0,
        ).filter(
            models.Q(status__in=[StatusContrato.EXPIRADO, StatusContrato.CONCLUIDO])
            | models.Q(data_termino__lt=hoje)
        )
        if destino_id:
            qs = qs.exclude(id=destino_id)

        dados = [
            {
                "id": c.id,
                "numero": c.numero,
                "saldo": str(c.saldo),
                "horas_contratadas": str(c.horas_contratadas),
                "horas_consumidas": str(c.horas_consumidas),
                "status": c.status,
                "status_display": c.get_status_display(),
                "data_inicio": c.data_inicio.isoformat() if c.data_inicio else None,
                "data_termino": c.data_termino.isoformat() if c.data_termino else None,
                "data_fim_carencia": c.data_fim_carencia.isoformat() if c.data_fim_carencia else None,
                "em_carencia": c.em_carencia,
            }
            for c in qs.order_by("-data_termino", "-criado_em")
        ]
        return Response(dados)

    @action(detail=False, methods=["post"], permission_classes=[IsEmpresaAdmin])
    def migrar(self, request):
        origem = request.data.get("contrato_origem")
        destino = request.data.get("contrato_destino")
        if not origem or not destino:
            raise ValidationError({"detail": "contrato_origem e contrato_destino são obrigatórios."})

        qtd_raw = request.data.get("quantidade")
        quantidade = Decimal(str(qtd_raw)) if qtd_raw not in (None, "", 0, "0") else None
        motivo = request.data.get("motivo", "").strip()

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)

        res = SaldoService.migrar_saldo_contratos_vencidos(
            contrato_origem_id=origem,
            contrato_destino_id=destino,
            quantidade=quantidade,
            autor=request.user,
            motivo=motivo,
            ip_origem=ip,
            user_agent=ua,
        )

        return Response({
            "detail": "Migração e aproveitamento de saldo executados com sucesso!",
            "transferencia_id": res["transferencia"].id,
            "quantidade": str(res["quantidade"]),
            "saldo_origem": str(res["saldo_origem"]),
            "saldo_destino": str(res["saldo_destino"]),
        })

    @action(detail=False, methods=["get"], permission_classes=[IsEmpresaAdmin])
    def contratos_devedores(self, request):
        """
        Retorna contratos de um cliente que possuem saldo devedor/negativo (saldo < 0),
        independentemente do status (ativo, expirado, concluído, suspenso).
        """
        cliente_id = request.query_params.get("cliente_id")
        if not cliente_id:
            raise ValidationError({"cliente_id": "Parâmetro obrigatório."})

        qs = Contrato.objects.filter(
            cliente_id=cliente_id,
            saldo__lt=0,
        )

        dados = [
            {
                "id": c.id,
                "numero": c.numero,
                "saldo": str(c.saldo),
                "valor_devedor": str(abs(c.saldo)),
                "horas_contratadas": str(c.horas_contratadas),
                "horas_consumidas": str(c.horas_consumidas),
                "status": c.status,
                "status_display": c.get_status_display(),
                "data_inicio": c.data_inicio.isoformat() if c.data_inicio else None,
                "data_termino": c.data_termino.isoformat() if c.data_termino else None,
                "descricao_servicos": c.descricao_servicos,
            }
            for c in qs.order_by("saldo", "-criado_em")
        ]
        return Response(dados)

    @action(detail=False, methods=["post"], permission_classes=[IsEmpresaAdmin])
    def compensar_debito(self, request):
        """
        Executa a compensação de saldo devedor de um contrato anterior abatendo da franquia
        inicial de um novo contrato ativo.
        """
        origem = request.data.get("contrato_origem")  # Novo contrato (saldo positivo)
        destino = request.data.get("contrato_destino")  # Contrato antigo devedor (saldo negativo)
        if not origem or not destino:
            raise ValidationError({"detail": "contrato_origem e contrato_destino são obrigatórios."})

        qtd_raw = request.data.get("quantidade")
        if not qtd_raw:
            raise ValidationError({"quantidade": "Informe a quantidade de horas a compensar."})

        quantidade = Decimal(str(qtd_raw))
        motivo = request.data.get("motivo", "").strip()

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)

        res = SaldoService.compensar_debito_contrato_anterior(
            contrato_novo_id=origem,
            contrato_devedor_id=destino,
            quantidade=quantidade,
            autor=request.user,
            motivo=motivo,
            ip_origem=ip,
            user_agent=ua,
        )

        return Response({
            "detail": "Compensação de débito contratual executada com sucesso!",
            "transferencia_id": res["transferencia"].id,
            "quantidade": str(res["quantidade"]),
            "saldo_novo": str(res["saldo_novo"]),
            "saldo_devedor": str(res["saldo_devedor"]),
        })