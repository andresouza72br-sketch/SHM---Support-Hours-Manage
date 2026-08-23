import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel

class TipoCiclo(models.TextChoices):
    CORRETIVA = "corretiva", "Corretiva"
    EVOLUTIVA = "evolutiva", "Evolutiva"
    PREVENTIVA = "preventiva", "Preventiva"
    ANALISE = "analise", "Análise"
    CONSULTORIA = "consultoria", "Consultoria"
    TREINAMENTO = "treinamento", "Treinamento"

class StatusCiclo(models.TextChoices):
    ORCADO = "orcado", "Orçado"
    AGUARDANDO_APROVACAO = "aguardando_aprovacao", "Aguardando Aprovação"
    APROVADO = "aprovado", "Aprovado"
    EM_EXECUCAO = "em_execucao", "Em Execução"
    AGUARDANDO_ACEITE = "aguardando_aceite", "Aguardando Aceite"
    ACEITO = "aceito", "Aceito"
    CANCELADO = "cancelado", "Cancelado"

class Ciclo(TimeStampedModel):
    pedido = models.ForeignKey(
        "pedidos.Pedido",
        on_delete=models.CASCADE,
        related_name="ciclos",
        verbose_name="pedido",
    )
    tipo = models.CharField("tipo de ciclo", max_length=20, choices=TipoCiclo.choices, default=TipoCiclo.ANALISE)
    contexto = models.TextField("contexto / escopo", blank=True, null=True)
    operador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ciclos_atribuidos",
        verbose_name="operador responsável",
    )
    status = models.CharField("status", max_length=25, choices=StatusCiclo.choices, default=StatusCiclo.ORCADO, db_index=True)
    horas_estimadas = models.DecimalField("horas estimadas", max_digits=8, decimal_places=2, default=Decimal("0.00"))
    horas_realizadas = models.DecimalField("horas realizadas", max_digits=8, decimal_places=2, default=Decimal("0.00"))
    apresentado_em = models.DateTimeField("apresentado em", null=True, blank=True)
    aprovado_em = models.DateTimeField("aprovado em", null=True, blank=True)
    aprovado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ciclos_aprovados",
    )
    aceito_em = models.DateTimeField("aceito em", null=True, blank=True)
    aceito_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ciclos_aceitos",
    )
    token_acesso = models.UUIDField("token Magic Link", default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        db_table = "shm_ciclo"
        ordering = ["-criado_em"]
        verbose_name = "ciclo de atendimento"
        verbose_name_plural = "ciclos de atendimento"

    def __str__(self):
        return f"Ciclo #{self.id} — {self.get_tipo_display()} ({self.pedido.protocolo})"