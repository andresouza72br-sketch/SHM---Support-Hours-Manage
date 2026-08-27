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

    @staticmethod
    @transaction.atomic
    def migrar_saldo_contratos_vencidos(
        contrato_origem_id,
        contrato_destino_id,
        quantidade: Decimal = None,
        autor=None,
        motivo: str = None,
        ip_origem: str = None,
        user_agent: str = None,
    ) -> dict:
        from apps.contratos.models import ContratoAuditLog, TipoEventoContratoAudit

        c_origem = Contrato.objects.select_for_update().get(id=contrato_origem_id)
        c_destino = Contrato.objects.select_for_update().get(id=contrato_destino_id)

        if c_origem.cliente_id != c_destino.cliente_id:
            raise ValidationError("Transferência permitida apenas entre contratos do mesmo cliente.")

        if c_origem.id == c_destino.id:
            raise ValidationError("O contrato de origem e destino não podem ser iguais.")

        if c_origem.saldo <= 0:
            raise ValidationError("O contrato de origem não possui saldo positivo para migração.")

        qtd_migrar = Decimal(str(quantidade)) if quantidade is not None and Decimal(str(quantidade)) > 0 else c_origem.saldo
        if qtd_migrar > c_origem.saldo:
            raise ValidationError(f"A quantidade solicitada ({qtd_migrar}h) é superior ao saldo remanescente disponível ({c_origem.saldo}h).")

        motivo_final = motivo or f"Aproveitamento e migração de saldo remanescente do contrato encerrado {c_origem.numero}"

        transf = TransferenciaSaldo.objects.create(
            contrato_origem=c_origem,
            contrato_destino=c_destino,
            quantidade=qtd_migrar,
            motivo=motivo_final,
            autor=autor,
        )

        c_origem.saldo -= qtd_migrar
        c_origem.save(update_fields=["saldo", "atualizado_em"])
        HistoricoSaldo.objects.create(
            contrato=c_origem,
            tipo_operacao=TipoOperacaoSaldo.TRANSFERENCIA_ENVIO,
            quantidade=-qtd_migrar,
            saldo_resultante=c_origem.saldo,
            autor=autor,
            descricao=f"Migração de saldo de contrato encerrado enviada para {c_destino.numero}: {motivo_final}",
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        c_destino.saldo += qtd_migrar
        c_destino.save(update_fields=["saldo", "atualizado_em"])
        HistoricoSaldo.objects.create(
            contrato=c_destino,
            tipo_operacao=TipoOperacaoSaldo.TRANSFERENCIA_RECEBIMENTO,
            quantidade=qtd_migrar,
            saldo_resultante=c_destino.saldo,
            autor=autor,
            descricao=f"Migração de saldo de contrato encerrado recebida de {c_origem.numero}: {motivo_final}",
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        # Registros de Auditoria Contratual Dupla
        usuario_str = (autor.get_full_name() or autor.username) if autor else "Administrador"
        ContratoAuditLog.objects.create(
            contrato=c_origem,
            tipo_evento=TipoEventoContratoAudit.ALTERACAO,
            descricao=f"Migração/aproveitamento de {qtd_migrar:.2f}h para o contrato {c_destino.numero} formalizada por {usuario_str}.",
            justificativa=motivo_final,
            usuario=autor,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )
        ContratoAuditLog.objects.create(
            contrato=c_destino,
            tipo_evento=TipoEventoContratoAudit.ALTERACAO,
            descricao=f"Recebimento de migração/aproveitamento de {qtd_migrar:.2f}h do contrato encerrado {c_origem.numero} formalizada por {usuario_str}.",
            justificativa=motivo_final,
            usuario=autor,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        return {
            "transferencia": transf,
            "saldo_origem": c_origem.saldo,
            "saldo_destino": c_destino.saldo,
            "quantidade": qtd_migrar,
        }