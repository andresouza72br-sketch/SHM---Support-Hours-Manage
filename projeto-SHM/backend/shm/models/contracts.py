import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone

from .clients import Cliente
from .users import Usuario


class Contrato(models.Model):
    class Status(models.TextChoices):
        RASCUNHO = "RASCUNHO", "Rascunho"
        ATIVO = "ATIVO", "Ativo"
        VENCIDO = "VENCIDO", "Vencido"
        ENCERRADO = "ENCERRADO", "Encerrado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    numero_contrato = models.CharField("Número do Contrato", max_length=50, unique=True)
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name="contratos",
        verbose_name="Cliente",
    )
    data_inicio = models.DateField("Data de Início")
    data_fim = models.DateField("Data de Fim")
    horas_contratadas = models.DecimalField(
        "Horas Contratadas", max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    horas_herdadas = models.DecimalField(
        "Horas Herdadas",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Saldo herdado (+ ou -) de contrato anterior.",
    )
    horas_consumidas = models.DecimalField(
        "Horas Consumidas",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    status = models.CharField(
        "Status",
        max_length=20,
        choices=Status.choices,
        default=Status.RASCUNHO,
    )
    limite_rollover_dias = models.PositiveIntegerField(
        "Dias Limite para Rollover",
        default=30,
        help_text="Prazo padrão em dias após o término para transferir o saldo.",
    )
    prorrogacao_rollover_ate = models.DateField(
        "Prorrogação de Rollover até",
        null=True,
        blank=True,
        help_text="Data estendida manualmente pelo Administrador para permitir o rollover.",
    )
    observacoes = models.TextField("Observações", blank=True, default="")
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"
        ordering = ["-data_inicio"]

    def __str__(self) -> str:
        return f"{self.numero_contrato} - {self.cliente.nome_fantasia}"

    @property
    def total_horas_disponiveis(self) -> Decimal:
        """Horas totais base contratadas + herdadas."""
        return self.horas_contratadas + self.horas_herdadas

    @property
    def saldo_horas(self) -> Decimal:
        """Saldo atual = (Contratadas + Herdadas) - Consumidas. Pode ser negativo."""
        return (self.horas_contratadas + self.horas_herdadas) - self.horas_consumidas

    @property
    def is_saldo_negativo(self) -> bool:
        return self.saldo_horas < Decimal("0.00")

    @property
    def percentual_consumido(self) -> float:
        total = float(self.total_horas_disponiveis)
        if total <= 0:
            return 100.0 if float(self.horas_consumidas) > 0 else 0.0
        return min(100.0, round((float(self.horas_consumidas) / total) * 100, 1))

    @property
    def data_limite_rollover_efetiva(self):
        if self.prorrogacao_rollover_ate:
            return self.prorrogacao_rollover_ate
        from datetime import timedelta

        return self.data_fim + timedelta(days=self.limite_rollover_dias)

    @property
    def is_rollover_valido(self) -> bool:
        """Verifica se o contrato ainda está dentro do prazo para transferência de saldo."""
        hoje = timezone.localdate()
        return hoje <= self.data_limite_rollover_efetiva


class SaldoTransferido(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contrato_origem = models.ForeignKey(
        Contrato,
        on_delete=models.PROTECT,
        related_name="transferencias_saida",
        verbose_name="Contrato de Origem",
    )
    contrato_destino = models.ForeignKey(
        Contrato,
        on_delete=models.PROTECT,
        related_name="transferencias_entrada",
        verbose_name="Contrato de Destino",
    )
    horas_transferidas = models.DecimalField(
        "Horas Transferidas",
        max_digits=10,
        decimal_places=2,
        help_text="Valor transferido (positivo ou negativo).",
    )
    data_transferencia = models.DateTimeField(
        "Data da Transferência", default=timezone.now
    )
    usuario_responsavel = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name="transferencias_saldo_realizadas",
        verbose_name="Usuário Responsável",
    )
    motivo = models.TextField("Motivo / Justificativa")
    created_at = models.DateTimeField("Criado em", auto_now_add=True)

    class Meta:
        verbose_name = "Transferência de Saldo"
        verbose_name_plural = "Transferências de Saldo"
        ordering = ["-data_transferencia"]

    def __str__(self) -> str:
        return f"{self.horas_transferidas}h de {self.contrato_origem.numero_contrato} -> {self.contrato_destino.numero_contrato}"
