from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel

class StatusPedido(models.TextChoices):
    ABERTO = "aberto", "Aberto"
    EM_ORCAMENTO = "em_orcamento", "Em Orçamento"
    AGUARDANDO_APROVACAO = "aguardando_aprovacao", "Aguardando Aprovação"
    EM_EXECUCAO = "em_execucao", "Em Execução"
    AGUARDANDO_ACEITE = "aguardando_aceite", "Aguardando Aceite"
    CONCLUIDO = "concluido", "Concluído"
    CANCELADO = "cancelado", "Cancelado"

class PrioridadePedido(models.TextChoices):
    BAIXA = "baixa", "Baixa"
    MEDIA = "media", "Média"
    ALTA = "alta", "Alta"
    URGENTE = "urgente", "Urgente"

class Pedido(TimeStampedModel):
    protocolo = models.CharField("protocolo", max_length=20, unique=True, db_index=True)
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.PROTECT,
        related_name="pedidos",
        verbose_name="cliente",
    )
    contrato = models.ForeignKey(
        "contratos.Contrato",
        on_delete=models.PROTECT,
        related_name="pedidos",
        verbose_name="contrato",
    )
    assunto = models.CharField("assunto", max_length=200)
    descricao = models.TextField("descrição detalhada")
    prioridade = models.CharField("prioridade", max_length=10, choices=PrioridadePedido.choices, default=PrioridadePedido.MEDIA)
    status = models.CharField("status", max_length=25, choices=StatusPedido.choices, default=StatusPedido.ABERTO, db_index=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="pedidos_criados",
        verbose_name="criado por",
    )

    class Meta:
        db_table = "shm_pedido"
        ordering = ["-criado_em"]
        verbose_name = "pedido de suporte"
        verbose_name_plural = "pedidos de suporte"

    def __str__(self):
        return f"{self.protocolo} — {self.assunto}"

class AnexoPedido(TimeStampedModel):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="anexos")
    arquivo = models.FileField("arquivo", upload_to="pedidos_anexos/%Y/%m/")
    nome_original = models.CharField("nome original", max_length=255)
    tamanho = models.IntegerField("tamanho em bytes", default=0)
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "shm_anexo_pedido"