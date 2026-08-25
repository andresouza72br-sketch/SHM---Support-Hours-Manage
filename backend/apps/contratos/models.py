import uuid
from decimal import Decimal
from datetime import date, timedelta
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.core.models import TimeStampedModel

class StatusContrato(models.TextChoices):
    PENDENTE_ACEITE = "pendente_aceite", "Pendente de Aceite"
    ATIVO = "ativo", "Ativo"
    SUSPENSO = "suspenso", "Suspenso"
    EXPIRADO = "expirado", "Expirado"

class TipoContrato(models.TextChoices):
    NOVO = "novo", "Novo"
    ADITIVO = "aditivo", "Aditivo"

class Contrato(TimeStampedModel):
    numero = models.CharField("número do contrato", max_length=30, unique=True, db_index=True)
    tipo = models.CharField("tipo", max_length=10, choices=TipoContrato.choices, default=TipoContrato.NOVO)
    contrato_referencia = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="aditivos",
        verbose_name="contrato de referência",
    )
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.PROTECT,
        related_name="contratos",
        verbose_name="cliente",
    )
    data_inicio = models.DateField("data de início")
    data_termino = models.DateField("data de término", null=True, blank=True)
    horas_contratadas = models.DecimalField("horas contratadas", max_digits=10, decimal_places=2)
    saldo = models.DecimalField("saldo de horas", max_digits=10, decimal_places=2, default=Decimal("0.00"))
    horas_consumidas = models.DecimalField("horas consumidas", max_digits=10, decimal_places=2, default=Decimal("0.00"))
    data_fim_carencia = models.DateField("data fim de carência", null=True, blank=True)
    descricao_servicos = models.TextField("descrição dos serviços", blank=True, null=True)
    valor_mensal = models.DecimalField("valor mensal", max_digits=12, decimal_places=2, null=True, blank=True)
    observacoes = models.TextField("observações", blank=True, null=True)
    status = models.CharField("status", max_length=20, choices=StatusContrato.choices, default=StatusContrato.PENDENTE_ACEITE, db_index=True)
    data_aceite = models.DateTimeField("data de aceite", null=True, blank=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="contratos_criados",
        verbose_name="criado por",
    )

    class Meta:
        db_table = "shm_contrato"
        ordering = ["-criado_em"]
        verbose_name = "contrato"
        verbose_name_plural = "contratos"

    def __str__(self):
        return f"{self.numero} — {self.cliente}"

    @property
    def em_carencia(self) -> bool:
        if self.data_fim_carencia:
            return self.data_fim_carencia >= timezone.localdate()
        return False

    @property
    def saldo_devedor(self) -> Decimal:
        return abs(self.saldo) if self.saldo < 0 else Decimal("0.00")

    @property
    def saldo_remanescente(self) -> Decimal:
        if self.saldo > 0 and self.status == StatusContrato.EXPIRADO and self.em_carencia:
            return self.saldo
        return Decimal("0.00")

class ContratoPDF(TimeStampedModel):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="pdfs")
    arquivo = models.FileField("arquivo PDF", upload_to="contratos/%Y/%m/")
    nome_original = models.CharField("nome original", max_length=255)

    class Meta:
        db_table = "shm_contrato_pdf"

class AceiteLink(TimeStampedModel):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="aceite_links")
    token = models.UUIDField("token", default=uuid.uuid4, unique=True, editable=False)
    data_expiracao = models.DateTimeField("data de expiração")
    usado = models.BooleanField("usado", default=False)
    usado_em = models.DateTimeField("usado em", null=True, blank=True)
    usado_ip = models.GenericIPAddressField("IP de uso", null=True, blank=True)
    usado_user_agent = models.TextField("User-Agent de uso", null=True, blank=True)

    class Meta:
        db_table = "shm_aceite_link"