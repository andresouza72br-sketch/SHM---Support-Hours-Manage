import logging
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import Coalesce
from apps.tarefas.models import Tarefa, StatusTarefa

logger = logging.getLogger(__name__)

class TarefaService:
    """
    Camada de servico de dominio para o ciclo de vida e recalculador de Tarefas.
    """

    @staticmethod
    def recalcular_horas_ciclo(ciclo) -> Decimal:
        """
        Recalcula atomicamente o total de horas realizadas em um ciclo
        somando todas as tarefas com status 'realizada'.
        """
        total_realizadas = ciclo.tarefas.filter(
            status=StatusTarefa.REALIZADA
        ).aggregate(total=Coalesce(Sum("horas_realizadas"), Decimal("0.00")))["total"]

        ciclo.horas_realizadas = total_realizadas
        ciclo.save(update_fields=["horas_realizadas", "atualizado_em"])
        logger.info(
            "Horas do ciclo #%s recalculadas com sucesso: %sh realizadas",
            ciclo.id,
            total_realizadas,
        )
        return total_realizadas

    @staticmethod
    @transaction.atomic
    def criar_tarefa(ciclo, descricao: str, horas_estimadas: Decimal = Decimal("0.00"),
                     horas_realizadas: Decimal = Decimal("0.00"), status: str = StatusTarefa.PREVISTA,
                     operador=None) -> Tarefa:
        """
        Cria uma nova tarefa vinculada a um ciclo e sincroniza as horas se realizada.
        """
        tarefa = Tarefa.objects.create(
            ciclo=ciclo,
            descricao=descricao,
            horas_estimadas=horas_estimadas,
            horas_realizadas=horas_realizadas,
            status=status,
            operador=operador,
        )
        logger.info(
            "Tarefa #%s criada no ciclo #%s: %s (status=%s, estimadas=%sh, realizadas=%sh)",
            tarefa.id,
            ciclo.id,
            descricao[:30],
            status,
            horas_estimadas,
            horas_realizadas,
        )
        return tarefa

    @staticmethod
    @transaction.atomic
    def atualizar_tarefa(tarefa: Tarefa, **campos) -> Tarefa:
        """
        Atualiza campos de uma tarefa e sincroniza as horas do ciclo.
        """
        for campo, valor in campos.items():
            setattr(tarefa, campo, valor)
        tarefa.save()
        logger.info(
            "Tarefa #%s atualizada (campos: %s, novo_status=%s)",
            tarefa.id,
            list(campos.keys()),
            tarefa.status,
        )
        return tarefa

    @staticmethod
    @transaction.atomic
    def remover_tarefa(tarefa: Tarefa) -> None:
        """
        Remove uma tarefa e sincroniza as horas do ciclo.
        """
        tarefa_id = tarefa.id
        ciclo_id = tarefa.ciclo_id
        tarefa.delete()
        logger.info(
            "Tarefa #%s removida do ciclo #%s",
            tarefa_id,
            ciclo_id,
        )
