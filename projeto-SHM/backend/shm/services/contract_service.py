from datetime import date
from decimal import Decimal

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from shm.models.contracts import Contrato, SaldoTransferido
from shm.models.requests import Ciclo
from shm.models.timeline import ComentarioTimeline
from shm.models.users import Usuario

from .timeline_service import TimelineService


class ContractService:
    @staticmethod
    @transaction.atomic
    def deduzir_horas_ciclo(ciclo: Ciclo, usuario: Usuario) -> Contrato:
        """
        Deduz as horas realizadas de um ciclo no contrato ativo após o Aceite Final do Cliente.
        Permite saldo negativo conforme RN-CON-003.
        """
        if usuario.tipo_perfil != Usuario.TipoPerfil.GESTOR_CLIENTE:
            raise PermissionDenied(
                "Apenas o Gestor do Cliente pode dar o aceite final."
            )

        if usuario.cliente_id != ciclo.pedido.cliente_id:
            raise PermissionDenied(
                "Usuário não pertence ao cliente titular deste contrato."
            )

        if ciclo.status != Ciclo.Status.AGUARDANDO_ACEITE:
            raise ValidationError(
                f"O ciclo está no status '{ciclo.get_status_display()}', mas deve estar em 'Aguardando Aceite Final'."
            )

        ciclo.recalcular_totais()
        horas_para_deduzir = ciclo.horas_realizadas_total

        # Obter contrato bloqueando para atualização concorrente
        contrato = Contrato.objects.select_for_update().get(id=ciclo.pedido.contrato_id)
        saldo_anterior = contrato.saldo_horas

        contrato.horas_consumidas += horas_para_deduzir
        contrato.save(update_fields=["horas_consumidas", "updated_at"])

        novo_saldo = contrato.saldo_horas

        # Atualiza status do ciclo
        agora = timezone.now()
        ciclo.status = Ciclo.Status.ACEITO
        ciclo.aceite_por = usuario
        ciclo.aceite_em = agora
        ciclo.save(update_fields=["status", "aceite_por", "aceite_em", "updated_at"])

        # Registro na timeline
        msg = (
            f"Aceite final confirmado por {usuario.nome_completo}. "
            f"Horas realizadas ({horas_para_deduzir:.2f}h) deduzidas do Contrato {contrato.numero_contrato}. "
            f"Saldo anterior: {saldo_anterior:.2f}h | Novo saldo: {novo_saldo:.2f}h."
        )
        if novo_saldo < Decimal("0.00"):
            msg += " ⚠️ O contrato atingiu saldo negativo."

        TimelineService.registrar_evento(
            conteudo=msg,
            tipo_evento=ComentarioTimeline.TipoEvento.ACEITE,
            pedido=ciclo.pedido,
            ciclo=ciclo,
            autor=usuario,
            horas_contexto=horas_para_deduzir,
        )

        return contrato

    @staticmethod
    @transaction.atomic
    def transferir_saldo(
        contrato_origem: Contrato,
        contrato_destino: Contrato,
        usuario: Usuario,
        motivo: str,
        ignorar_prazo: bool = False,
    ) -> SaldoTransferido:
        """
        Transfere o saldo (positivo ou negativo) de um contrato para um novo contrato.
        Gera registro em SaldoTransferido e encerra o contrato de origem.
        """
        if usuario.tipo_perfil != Usuario.TipoPerfil.ADMIN_EMPRESA:
            raise PermissionDenied(
                "Apenas o Administrador da Empresa pode realizar transferência de saldos."
            )

        if contrato_origem.cliente_id != contrato_destino.cliente_id:
            raise ValidationError(
                "Os contratos de origem e destino devem pertencer ao mesmo cliente."
            )

        if contrato_origem.id == contrato_destino.id:
            raise ValidationError(
                "O contrato de origem e destino não podem ser o mesmo."
            )

        if not ignorar_prazo and not contrato_origem.is_rollover_valido:
            raise ValidationError(
                f"O prazo de rollover de 30 dias expirou em {contrato_origem.data_limite_rollover_efetiva:%d/%m/%Y}. "
                "Prorrogue a data limite manualmente para autorizar a transferência."
            )

        origem_lock = Contrato.objects.select_for_update().get(id=contrato_origem.id)
        destino_lock = Contrato.objects.select_for_update().get(id=contrato_destino.id)

        saldo_a_transferir = origem_lock.saldo_horas

        # Atualiza contrato destino com as horas herdadas
        destino_lock.horas_herdadas += saldo_a_transferir
        destino_lock.save(update_fields=["horas_herdadas", "updated_at"])

        # Encerra contrato origem
        origem_lock.status = Contrato.Status.ENCERRADO
        origem_lock.save(update_fields=["status", "updated_at"])

        registro = SaldoTransferido.objects.create(
            contrato_origem=origem_lock,
            contrato_destino=destino_lock,
            horas_transferidas=saldo_a_transferir,
            usuario_responsavel=usuario,
            motivo=motivo,
        )

        return registro

    @staticmethod
    def prorrogar_rollover(
        contrato: Contrato, nova_data: date, usuario: Usuario
    ) -> Contrato:
        """Permite ao Administrador estender a data limite de rollover."""
        if usuario.tipo_perfil != Usuario.TipoPerfil.ADMIN_EMPRESA:
            raise PermissionDenied(
                "Apenas o Administrador pode estender o prazo de rollover."
            )

        if nova_data <= contrato.data_fim:
            raise ValidationError(
                "A nova data de rollover deve ser posterior ao término da vigência do contrato."
            )

        contrato.prorrogacao_rollover_ate = nova_data
        contrato.save(update_fields=["prorrogacao_rollover_ate", "updated_at"])
        return contrato
