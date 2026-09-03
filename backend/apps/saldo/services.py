import logging
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from apps.contratos.models import Contrato, StatusContrato
from apps.contratos.services import ContratoService
from apps.saldo.models import HistoricoSaldo, TipoOperacaoSaldo, TransferenciaSaldo, Reabastecimento

logger = logging.getLogger(__name__)

def _obter_par_contratos_com_lock_ordenado(contrato_origem_id, contrato_destino_id) -> tuple[Contrato, Contrato]:
    """
    Adquire locks pessimistas select_for_update em ordem deterministica por ID
    para eliminar riscos de deadlock em transferencias concorrentes e reduzir
    o overhead para uma unica query SQL.
    """
    if str(contrato_origem_id) == str(contrato_destino_id):
        raise ValidationError("O contrato de origem e destino não podem ser iguais.")

    ids_ordenados = sorted([contrato_origem_id, contrato_destino_id], key=lambda x: str(x))
    locked_qs = Contrato.objects.select_for_update().filter(id__in=ids_ordenados).order_by("id")
    mapa_contratos = {c.id: c for c in locked_qs}

    if contrato_origem_id not in mapa_contratos:
        Contrato.objects.get(id=contrato_origem_id)
    if contrato_destino_id not in mapa_contratos:
        Contrato.objects.get(id=contrato_destino_id)

    return mapa_contratos[contrato_origem_id], mapa_contratos[contrato_destino_id]


def _executar_transferencia_contabil_atomica(
    contrato_origem: Contrato,
    contrato_destino: Contrato,
    quantidade: Decimal,
    autor,
    motivo: str,
    descricao_envio: str = None,
    descricao_recebimento: str = None,
    ip_origem: str = None,
    user_agent: str = None,
) -> TransferenciaSaldo:
    """
    Executa a movimentação atômica no banco de dados:
    - Persiste o registro de TransferenciaSaldo
    - Atualiza os saldos dos contratos origem e destino
    - Registra as duas entradas correlacionadas no HistoricoSaldo (Ledger)
    """
    desc_envio = descricao_envio or f"Transferência enviada para {contrato_destino.numero}: {motivo}"
    desc_receb = descricao_recebimento or f"Transferência recebida de {contrato_origem.numero}: {motivo}"

    transf = TransferenciaSaldo.objects.create(
        contrato_origem=contrato_origem,
        contrato_destino=contrato_destino,
        quantidade=quantidade,
        motivo=motivo,
        autor=autor,
    )

    contrato_origem.saldo -= quantidade
    contrato_origem.save(update_fields=["saldo", "atualizado_em"])
    HistoricoSaldo.objects.create(
        contrato=contrato_origem,
        tipo_operacao=TipoOperacaoSaldo.TRANSFERENCIA_ENVIO,
        quantidade=-quantidade,
        saldo_resultante=contrato_origem.saldo,
        autor=autor,
        descricao=desc_envio,
        ip_origem=ip_origem,
        user_agent=user_agent,
    )

    contrato_destino.saldo += quantidade
    contrato_destino.save(update_fields=["saldo", "atualizado_em"])
    HistoricoSaldo.objects.create(
        contrato=contrato_destino,
        tipo_operacao=TipoOperacaoSaldo.TRANSFERENCIA_RECEBIMENTO,
        quantidade=quantidade,
        saldo_resultante=contrato_destino.saldo,
        autor=autor,
        descricao=desc_receb,
        ip_origem=ip_origem,
        user_agent=user_agent,
    )

    return transf


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
        
        saldo_anterior = contrato.saldo
        novo_saldo = contrato.saldo - horas
        contrato.saldo = novo_saldo
        contrato.horas_consumidas += horas
        contrato.save(update_fields=["saldo", "horas_consumidas", "atualizado_em"])

        historico = HistoricoSaldo.objects.create(
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

        # Disparo de alertas automáticos de saldo (80% consumido ou saldo esgotado/devedor)
        try:
            from apps.notificacoes.services import NotificacaoService
            franquia_total = contrato.horas_contratadas
            if franquia_total and franquia_total > 0:
                limite_20_porcento = franquia_total * Decimal("0.20")
                if saldo_anterior > limite_20_porcento and novo_saldo <= limite_20_porcento and novo_saldo > 0:
                    NotificacaoService.notificar_alerta_saldo(contrato, tipo_alerta="80_porcento", saldo_anterior=saldo_anterior, saldo_novo=novo_saldo)
                elif saldo_anterior > 0 and novo_saldo <= 0:
                    NotificacaoService.notificar_alerta_saldo(contrato, tipo_alerta="saldo_esgotado", saldo_anterior=saldo_anterior, saldo_novo=novo_saldo)
        except Exception as alerta_err:
            logger.warning("Falha ao processar alertas automáticos de saldo do contrato %s: %s", getattr(contrato, "numero", contrato), alerta_err)

        return historico


    @staticmethod
    @transaction.atomic
    def transferir(contrato_origem_id, contrato_destino_id, quantidade: Decimal, autor, motivo: str) -> TransferenciaSaldo:
        if quantidade <= 0:
            raise ValidationError("Quantidade deve ser maior que zero.")

        c_origem, c_destino = _obter_par_contratos_com_lock_ordenado(contrato_origem_id, contrato_destino_id)

        if c_origem.cliente_id != c_destino.cliente_id:
            raise ValidationError("Transferência permitida apenas entre contratos do mesmo cliente.")

        if c_origem.saldo < quantidade:
            raise ValidationError("Saldo insuficiente no contrato de origem.")

        return _executar_transferencia_contabil_atomica(
            contrato_origem=c_origem,
            contrato_destino=c_destino,
            quantidade=quantidade,
            autor=autor,
            motivo=motivo,
        )

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

        c_origem, c_destino = _obter_par_contratos_com_lock_ordenado(contrato_origem_id, contrato_destino_id)

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

        transf = _executar_transferencia_contabil_atomica(
            contrato_origem=c_origem,
            contrato_destino=c_destino,
            quantidade=qtd_migrar,
            autor=autor,
            motivo=motivo_final,
            descricao_envio=f"Migração de saldo de contrato encerrado enviada para {c_destino.numero}: {motivo_final}",
            descricao_recebimento=f"Migração de saldo de contrato encerrado recebida de {c_origem.numero}: {motivo_final}",
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        # Auditoria e Notificações Contratuais Desacopladas
        ContratoService.notificar_e_auditar_migracao_saldo(
            contrato_origem=c_origem,
            contrato_destino=c_destino,
            quantidade=qtd_migrar,
            autor=autor,
            motivo=motivo_final,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        return {
            "transferencia": transf,
            "saldo_origem": c_origem.saldo,
            "saldo_destino": c_destino.saldo,
            "quantidade": qtd_migrar,
        }

    @staticmethod
    @transaction.atomic
    def compensar_debito_contrato_anterior(
        contrato_novo_id,
        contrato_devedor_id,
        quantidade: Decimal,
        autor,
        motivo: str = None,
        ip_origem: str = "",
        user_agent: str = "",
    ):
        c_novo, c_devedor = _obter_par_contratos_com_lock_ordenado(contrato_novo_id, contrato_devedor_id)

        if c_novo.cliente_id != c_devedor.cliente_id:
            raise ValidationError("A compensação de débito é permitida apenas entre contratos do mesmo cliente.")

        if c_devedor.saldo >= 0:
            raise ValidationError("O contrato indicado não possui saldo devedor/negativo.")

        debito_absoluto = abs(c_devedor.saldo)
        if quantidade <= 0:
            raise ValidationError("A quantidade de horas a compensar deve ser maior que zero.")

        if quantidade > debito_absoluto:
            raise ValidationError(
                f"O teto máximo a debitar do novo contrato é de {debito_absoluto:.2f}h (dívida total do contrato {c_devedor.numero})."
            )

        if c_novo.saldo < quantidade:
            raise ValidationError(
                f"Saldo insuficiente no novo contrato ({c_novo.saldo:.2f}h) para abater {quantidade:.2f}h."
            )

        motivo_final = motivo or f"Compensação e quitação de saldo devedor do contrato {c_devedor.numero} com horas da franquia do contrato {c_novo.numero}."

        transf = _executar_transferencia_contabil_atomica(
            contrato_origem=c_novo,
            contrato_destino=c_devedor,
            quantidade=quantidade,
            autor=autor,
            motivo=motivo_final,
            descricao_envio=f"Abatimento de franquia para quitação de débito do contrato {c_devedor.numero}",
            descricao_recebimento=f"Quitação de saldo devedor compensado pelo novo contrato {c_novo.numero}",
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        # Auditoria e Notificações Contratuais Desacopladas
        ContratoService.notificar_e_auditar_compensacao_debito(
            contrato_novo=c_novo,
            contrato_devedor=c_devedor,
            quantidade=quantidade,
            autor=autor,
            motivo=motivo_final,
            ip_origem=ip_origem,
            user_agent=user_agent,
        )

        return {
            "transferencia": transf,
            "saldo_novo": c_novo.saldo,
            "saldo_devedor": c_devedor.saldo,
            "quantidade": quantidade,
        }