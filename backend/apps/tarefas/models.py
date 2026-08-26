from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel

class StatusTarefa(models.TextChoices):
    PREVISTA = "prevista", "Prevista"
    REALIZADA = "realizada", "Realizada"
    CANCELADA = "cancelada", "Cancelada"

class Tarefa(TimeStampedModel):
    ciclo = models.ForeignKey(
        "ciclos.Ciclo",
        on_delete=models.CASCADE,
        related_name="tarefas",
        verbose_name="ciclo",
    )
    descricao = models.TextField("descrição do serviço")
    horas_estimadas = models.DecimalField("horas estimadas", max_digits=8, decimal_places=2, default=Decimal("0.00"))
    horas_realizadas = models.DecimalField("horas realizadas", max_digits=8, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField("status", max_length=15, choices=StatusTarefa.choices, default=StatusTarefa.PREVISTA)
    operador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tarefas_executadas",
    )

    class Meta:
        db_table = "shm_tarefa"
        ordering = ["criado_em"]
        verbose_name = "tarefa"
        verbose_name_plural = "tarefas"

    def __str__(self):
        return f"Tarefa #{self.id} ({self.horas_realizadas}h) — {self.descricao[:40]}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Recalcula horas realizadas do ciclo (as horas estimadas do ciclo são fixas e aprovadas)
        total_realizadas = sum(t.horas_realizadas for t in self.ciclo.tarefas.filter(status=StatusTarefa.REALIZADA))
        self.ciclo.horas_realizadas = total_realizadas
        self.ciclo.save(update_fields=["horas_realizadas", "atualizado_em"])

    def delete(self, *args, **kwargs):
        ciclo = self.ciclo
        super().delete(*args, **kwargs)
        total_realizadas = sum(t.horas_realizadas for t in ciclo.tarefas.filter(status=StatusTarefa.REALIZADA))
        ciclo.horas_realizadas = total_realizadas
        ciclo.save(update_fields=["horas_realizadas", "atualizado_em"])