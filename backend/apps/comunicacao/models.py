import uuid
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class Comentario(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ciclo = models.ForeignKey("ciclos.Ciclo", on_delete=models.CASCADE, related_name="comentarios", null=True, blank=True)
    tarefa = models.ForeignKey("tarefas.Tarefa", on_delete=models.SET_NULL, related_name="comentarios", null=True, blank=True)
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="comentarios")
    texto = models.TextField("texto", max_length=4000)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="respostas",
        verbose_name="comentário pai",
    )
    tarefa_convertida = models.ForeignKey("tarefas.Tarefa", on_delete=models.SET_NULL, null=True, blank=True, related_name="comentarios_origem")

    class Meta:
        db_table = "shm_comentario"
        ordering = ["criado_em"]


class AnexoComentario(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    comentario = models.ForeignKey(Comentario, on_delete=models.CASCADE, related_name="anexos")
    arquivo = models.FileField("arquivo", upload_to="comentarios_anexos/%Y/%m/")
    nome_original = models.CharField("nome original", max_length=255)
    tamanho = models.IntegerField("tamanho em bytes", default=0)

    class Meta:
        db_table = "shm_anexo_comentario"


class ReacaoComentario(TimeStampedModel):
    """Reação (like/emoji) de um usuário a um comentário. Toggle único por (comentário, autor, tipo)."""

    comentario = models.ForeignKey(
        Comentario,
        on_delete=models.CASCADE,
        related_name="reacoes",
        verbose_name="comentário",
    )
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reacoes_comentarios",
        verbose_name="autor da reação",
    )
    tipo = models.CharField("tipo de reação", max_length=20, default="like")

    class Meta:
        db_table = "shm_reacao_comentario"
        unique_together = [["comentario", "autor", "tipo"]]
        verbose_name = "reação ao comentário"
        verbose_name_plural = "reações aos comentários"

    def __str__(self):
        return f"{self.autor} — {self.tipo} em Comentário #{self.comentario_id}"