import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.core.models import TimeStampedModel


class TipoCiclo(models.TextChoices):
    CORRETIVA = "corretiva", "Corretiva"
    EVOLUTIVA = "evolutiva", "Evolutiva"
    PREVENTIVA = "preventiva", "Preventiva"
    ANALISE = "analise", "Análise"
    CONSULTORIA = "consultoria", "Consultoria"
    TREINAMENTO = "treinamento", "Treinamento"
    TESTE = "teste", "Teste"

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
    aprovado_ip = models.GenericIPAddressField("IP de aprovação", null=True, blank=True)
    aprovado_user_agent = models.TextField("User-Agent de aprovação", null=True, blank=True)
    aprovado_metodo = models.CharField("método de aprovação", max_length=20, default="APP")
    aceito_ip = models.GenericIPAddressField("IP de aceite", null=True, blank=True)
    aceito_user_agent = models.TextField("User-Agent de aceite", null=True, blank=True)
    aceito_metodo = models.CharField("método de aceite", max_length=20, default="APP")
    anexos_pedido = models.ManyToManyField(
        "pedidos.AnexoPedido",
        blank=True,
        related_name="ciclos_referenciados",
        verbose_name="anexos do pedido referenciados",
        db_table="shm_ciclo_anexos_pedido",
    )

    class Meta:
        db_table = "shm_ciclo"
        ordering = ["-criado_em"]
        verbose_name = "ciclo de atendimento"
        verbose_name_plural = "ciclos de atendimento"

    def __str__(self):
        return f"Ciclo #{self.id} — {self.get_tipo_display()} ({self.pedido.protocolo})"

class TipoAcaoMagicLink(models.TextChoices):
    APROVACAO_ORCAMENTO = "aprovacao_orcamento", "Aprovação de Orçamento"
    ACEITE_CICLO = "aceite_ciclo", "Aceite Final de Ciclo"
    AVALIACAO_CICLO = "avaliacao_ciclo", "Avaliação de Satisfação"

class CicloMagicLink(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ciclo = models.ForeignKey(
        Ciclo,
        on_delete=models.CASCADE,
        related_name="magic_links",
        verbose_name="ciclo",
    )
    tipo_acao = models.CharField("tipo de ação", max_length=30, choices=TipoAcaoMagicLink.choices, db_index=True)
    token = models.UUIDField("token seguro", default=uuid.uuid4, unique=True, db_index=True, editable=False)
    expira_em = models.DateTimeField("expira em", db_index=True)
    usado = models.BooleanField("usado", default=False, db_index=True)
    usado_em = models.DateTimeField("usado em", null=True, blank=True)
    usado_ip = models.GenericIPAddressField("IP de uso", null=True, blank=True)
    usado_user_agent = models.TextField("User-Agent de uso", null=True, blank=True)

    class Meta:
        db_table = "shm_ciclo_magic_link"
        ordering = ["-criado_em"]
        verbose_name = "magic link de ciclo"
        verbose_name_plural = "magic links de ciclos"

    def __str__(self):
        return f"Magic Link ({self.get_tipo_acao_display()}) — Ciclo #{self.ciclo_id} [Usado: {self.usado}]"


class AvaliacaoCiclo(TimeStampedModel):
    """Avaliação de satisfação do cliente após o aceite do ciclo (rating 1–5 ⭐)."""

    ciclo = models.OneToOneField(
        Ciclo,
        on_delete=models.CASCADE,
        related_name="avaliacao",
        verbose_name="ciclo avaliado",
    )
    avaliador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="avaliacoes_ciclos",
        verbose_name="avaliador",
    )
    nota = models.PositiveSmallIntegerField(
        "nota (1–5)",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comentario = models.TextField("comentário", max_length=2000, blank=True)

    class Meta:
        db_table = "shm_avaliacao_ciclo"
        verbose_name = "avaliação de ciclo"
        verbose_name_plural = "avaliações de ciclos"

    def __str__(self):
        return f"Avaliação {self.nota}⭐ — Ciclo #{self.ciclo_id} por {self.avaliador}"