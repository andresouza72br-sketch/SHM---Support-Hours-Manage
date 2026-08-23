from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from apps.ciclos.models import Ciclo, StatusCiclo
from apps.pedidos.services import PedidoService

class CicloService:
    @staticmethod
    @transaction.atomic
    def criar_ciclo(pedido_id, tipo, contexto, operador, horas_estimadas=0) -> Ciclo:
        from apps.pedidos.models import Pedido
        pedido = Pedido.objects.get(id=pedido_id)
        ciclo = Ciclo.objects.create(
            pedido=pedido,
            tipo=tipo,
            contexto=contexto,
            operador=operador,
            horas_estimadas=Decimal(str(horas_estimadas)),
            status=StatusCiclo.ORCADO,
        )
        PedidoService.sincronizar_status_pedido(pedido)
        return ciclo

    @staticmethod
    @transaction.atomic
    def apresentar_orcamento(ciclo: Ciclo, horas_estimadas: Decimal) -> Ciclo:
        if horas_estimadas <= 0:
            raise ValidationError("Horas estimadas deve ser maior que zero.")
        ciclo.horas_estimadas = horas_estimadas
        ciclo.status = StatusCiclo.AGUARDANDO_APROVACAO
        ciclo.apresentado_em = timezone.now()
        ciclo.save(update_fields=["horas_estimadas", "status", "apresentado_em", "atualizado_em"])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        return ciclo

    @staticmethod
    @transaction.atomic
    def aprovar_orcamento(ciclo: Ciclo, usuario) -> Ciclo:
        ciclo.status = StatusCiclo.APROVADO
        ciclo.aprovado_em = timezone.now()
        ciclo.aprovado_por = usuario if usuario.is_authenticated else None
        ciclo.save(update_fields=["status", "aprovado_em", "aprovado_por", "atualizado_em"])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        return ciclo

    @staticmethod
    @transaction.atomic
    def rejeitar_orcamento(ciclo: Ciclo, justificativa: str) -> Ciclo:
        if not justificativa.strip():
            raise ValidationError("Justificativa é obrigatória para rejeitar orçamento.")
        ciclo.status = StatusCiclo.ORCADO
        ciclo.apresentado_em = None
        ciclo.save(update_fields=["status", "apresentado_em", "atualizado_em"])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        return ciclo

    @staticmethod
    @transaction.atomic
    def iniciar_execucao(ciclo: Ciclo) -> Ciclo:
        ciclo.status = StatusCiclo.EM_EXECUCAO
        ciclo.save(update_fields=["status", "atualizado_em"])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        return ciclo

    @staticmethod
    @transaction.atomic
    def solicitar_aceite(ciclo: Ciclo) -> Ciclo:
        ciclo.status = StatusCiclo.AGUARDANDO_ACEITE
        ciclo.save(update_fields=["status", "atualizado_em"])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        return ciclo

    @staticmethod
    @transaction.atomic
    def aceitar_ciclo(ciclo: Ciclo, usuario) -> Ciclo:
        ciclo.status = StatusCiclo.ACEITO
        ciclo.aceito_em = timezone.now()
        ciclo.aceito_por = usuario if usuario.is_authenticated else None
        ciclo.save(update_fields=["status", "aceito_em", "aceito_por", "atualizado_em"])

        # Débito de saldo real no contrato
        from apps.saldo.services import SaldoService
        if ciclo.horas_realizadas > 0:
            SaldoService.consumir(
                contrato=ciclo.pedido.contrato,
                horas=ciclo.horas_realizadas,
                pedido=ciclo.pedido,
                ciclo=ciclo,
            )

        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        return ciclo

    @staticmethod
    @transaction.atomic
    def recusar_aceite(ciclo: Ciclo, justificativa: str) -> Ciclo:
        if not justificativa.strip():
            raise ValidationError("Justificativa é obrigatória para recusar o aceite.")
        ciclo.status = StatusCiclo.EM_EXECUCAO
        ciclo.save(update_fields=["status", "atualizado_em"])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        return ciclo