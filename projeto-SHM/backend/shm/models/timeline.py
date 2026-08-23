import uuid

from django.db import models

from .requests import Ciclo, Pedido
from .users import Usuario


class ComentarioTimeline(models.Model):
    class TipoEvento(models.TextChoices):
        COMENTARIO = "COMENTARIO", "Comentário / Mensagem"
        MUDANCA_STATUS = "MUDANCA_STATUS", "Mudança de Status"
        AJUSTE_HORAS = "AJUSTE_HORAS", "Ajuste de Horas"
        APROVACAO = "APROVACAO", "Aprovação de Orçamento"
        REJEICAO = "REJEICAO", "Rejeição de Orçamento"
        SOLICITACAO_ACEITE = "SOLICITACAO_ACEITE", "Solicitação de Aceite"
        ACEITE = "ACEITE", "Aceite Final Concedido"
        SISTEMA = "SISTEMA", "Evento do Sistema"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pedido = models.ForeignKey(
        Pedido,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="timeline",
        verbose_name="Pedido",
    )
    ciclo = models.ForeignKey(
        Ciclo,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="timeline",
        verbose_name="Ciclo",
    )
    autor = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="comentarios_timeline",
        verbose_name="Autor",
    )
    tipo_evento = models.CharField(
        "Tipo de Evento",
        max_length=30,
        choices=TipoEvento.choices,
        default=TipoEvento.COMENTARIO,
    )
    conteudo = models.TextField("Conteúdo / Descrição")
    horas_contexto = models.DecimalField(
        "Horas no Contexto",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField("Data e Hora", auto_now_add=True)

    class Meta:
        verbose_name = "Evento da Timeline"
        verbose_name_plural = "Eventos da Timeline"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        autor_nome = self.autor.nome_completo if self.autor else "Sistema"
        return f"[{self.get_tipo_evento_display()}] {autor_nome} em {self.created_at:%d/%m/%Y %H:%M}"
