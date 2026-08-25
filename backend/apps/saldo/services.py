from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from apps.contratos.models import Contrato, StatusContrato
from apps.saldo.models import HistoricoSaldo, TipoOperacaoSaldo, TransferenciaSaldo, Reabastecimento

class SaldoService:
    @staticmethod
    @transaction.atomic
    def consumir(
        contrato: Contrato,
        horas: Decimal,
        pedido=None,
        ciclo=None,
        autor=None,
        ip_origem: str = None,
        user_agent: str = None,
        metodo_aprovacao: str = "APP",
    ) -> HistoricoSaldo:
        contrato = Contrato.objects.select_for_update().get(id=contrato.id)
        if horas <= 0:
            return None
        
        novo_saldo = contrato.saldo - horas
        contrato.saldo = novo_saldo
        contrato.horas_consumidas += horas
        contrato.save(update_fields=["saldo", "horas_consumidas", "atualizado_em"])

        return HistoricoSaldo.objects.create(
            contrato=contrato,
            tipo_operacao=TipoOperacaoSaldo.CONSUMO,
            quantidade=-horas,
            saldo_resultante=novo_saldo,
            autor=autor,
            pedido=pedido,
            ciclo=ciclo,
            descricao=f"Consumo referente ao aceite do Ciclo #{ciclo.id if ciclo else '?'} (Pedido {pedido.protocolo if pedido else '?'})",
            ip_origem=ip_origem,
            user_agent=user_agent,
            metodo_aprovacao=metodo_aprovacao,
        )

    @staticmethod
    @transaction.atomic
    def transferir(contrato_origem_id, contrato_destino_id, quantidade: Decimal, autor, motivo: str) -> TransferenciaSaldo:
        if quantidade <= 0:
            raise ValidationError("Quantidade deve ser maior que zero.")

        c_origem = Contrato.objects.select_for_update().get(id=contrato_origem_id)
        c_destino = Contrato.objects.select_for_update().get(id=contrato_destino_id)

        if c_origem.cliente_id != c_destino.cliente_id:
            raise ValidationError("Transferência permitida apenas entre contratos do mesmo cliente.")

        if c_origem.saldo < quantidade:
            raise ValidationError("Saldo insuficiente no contrato de origem.")

        transf = TransferenciaSaldo.objects.create(
            contrato_origem=c_origem,
            contrato_destino=c_destino,
            quantidade=quantidade,
            motivo=motivo,
            autor=autor,
        )

        c_origem.saldo -= quantidade
        c_origem.save(update_fields=["saldo", "atualizado_em"])
        HistoricoSaldo.objects.create(
            contrato=c_origem,
            tipo_operacao=TipoOperacaoSaldo.TRANSFERENCIA_ENVIO,
            quantidade=-quantidade,
            saldo_resultante=c_origem.saldo,
            autor=autor,
            descricao=f"Transferência enviada para {c_destino.numero}: {motivo}",
        )

        c_destino.saldo += quantidade
        c_destino.save(update_fields=["saldo", "atualizado_em"])
        HistoricoSaldo.objects.create(
            contrato=c_destino,
            tipo_operacao=TipoOperacaoSaldo.TRANSFERENCIA_RECEBIMENTO,
            quantidade=quantidade,
            saldo_resultante=c_destino.saldo,
            autor=autor,
            descricao=f"Transferência recebida de {c_origem.numero}: {motivo}",
        )

        return transf

    @staticmethod
    @transaction.atomic
    def reabastecer(contrato_id, quantidade: Decimal, autor, motivo: str) -> Reabastecimento:
        if quantidade <= 0:
            raise ValidationError("Quantidade deve ser maior que zero.")

        contrato = Contrato.objects.select_for_update().get(id=contrato_id)
        reab = Reabastecimento.objects.create(
            contrato=contrato,
            quantidade=quantidade,
            motivo=motivo,
            autor=autor,
        )

        contrato.saldo += quantidade
        contrato.save(update_fields=["saldo", "atualizado_em"])
        HistoricoSaldo.objects.create(
            contrato=contrato,
            tipo_operacao=TipoOperacaoSaldo.REABASTECIMENTO,
            quantidade=quantidade,
            saldo_resultante=contrato.saldo,
            autor=autor,
            descricao=f"Reabastecimento aprovado: {motivo}",
        )

        return reab