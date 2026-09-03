import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel

class TipoOperacaoSaldo(models.TextChoices):
    CONSUMO = "consumo", "Consumo de Ciclo"
    TRANSFERENCIA_ENVIO = "transferencia_envio", "Transferência (Envio)"
    TRANSFERENCIA_RECEBIMENTO = "transferencia_recebimento", "Transferência (Recebimento)"
    REABASTECIMENTO = "reabastecimento", "Reabastecimento de Horas"
    ESTORNO = "estorno", "Estorno / Correção"

class HistoricoSaldo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contrato = models.ForeignKey(
        "contratos.Contrato",
        on_delete=models.PROTECT,
        related_name="historico_saldo",
        verbose_name="contrato",
    )
    tipo_operacao = models.CharField("tipo de operação", max_length=30, choices=TipoOperacaoSaldo.choices, db_index=True)
    quantidade = models.DecimalField("quantidade de horas", max_digits=8, decimal_places=2)
    saldo_resultante = models.DecimalField("saldo resultante", max_digits=10, decimal_places=2)
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="operacoes_saldo",
    )
    descricao = models.TextField("descrição / justificativa", blank=True, null=True)
    pedido = models.ForeignKey(
        "pedidos.Pedido",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consumos_saldo",
    )
    ciclo = models.ForeignKey(
        "ciclos.Ciclo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consumos_saldo",
    )
    operacao_original_id = models.UUIDField("operação original estornada", null=True, blank=True)
    ip_origem = models.GenericIPAddressField("IP de origem", null=True, blank=True)
    user_agent = models.TextField("User-Agent", null=True, blank=True)
    metodo_aprovacao = models.CharField("método de aprovação", max_length=50, default="APP")
    criado_em = models.DateTimeField("criado em", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "shm_historico_saldo"
        ordering = ["-criado_em"]
        verbose_name = "histórico de saldo"
        verbose_name_plural = "históricos de saldo"

    def __str__(self):
        return f"{self.tipo_operacao} ({self.quantidade}h) — Contrato #{self.contrato.numero}"

class TransferenciaSaldo(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contrato_origem = models.ForeignKey("contratos.Contrato", on_delete=models.PROTECT, related_name="transferencias_enviadas")
    contrato_destino = models.ForeignKey("contratos.Contrato", on_delete=models.PROTECT, related_name="transferencias_recebidas")
    quantidade = models.DecimalField("quantidade", max_digits=8, decimal_places=2)
    motivo = models.TextField("motivo da transferência")
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    class Meta:
        db_table = "shm_transferencia_saldo"

class Reabastecimento(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contrato = models.ForeignKey("contratos.Contrato", on_delete=models.PROTECT, related_name="reabastecimentos")
    quantidade = models.DecimalField("quantidade", max_digits=8, decimal_places=2)
    motivo = models.TextField("motivo do reabastecimento")
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    class Meta:
        db_table = "shm_reabastecimento"