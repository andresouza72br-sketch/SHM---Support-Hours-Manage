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