from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel

class TipoEventoTimeline(models.TextChoices):
    PEDIDO_CRIADO = "pedido_criado", "Pedido Aberto"
    ORCAMENTO_APRESENTADO = "orcamento_apresentado", "Orçamento Apresentado"
    ORCAMENTO_APROVADO = "orcamento_aprovado", "Orçamento Aprovado"
    ORCAMENTO_REJEITADO = "orcamento_rejeitado", "Orçamento Rejeitado"
    EXECUCAO_INICIADA = "execucao_iniciada", "Execução Iniciada"
    ACEITE_SOLICITADO = "aceite_solicitado", "Aceite Solicitado"
    CICLO_ACEITO = "ciclo_aceito", "Ciclo Aceito e Encerrado"
    ACEITE_RECUSADO = "aceite_recusado", "Aceite Recusado"

class TimelineEvent(models.Model):
    pedido = models.ForeignKey("pedidos.Pedido", on_delete=models.CASCADE, related_name="timeline")
    ciclo = models.ForeignKey("ciclos.Ciclo", on_delete=models.SET_NULL, null=True, blank=True, related_name="timeline")
    tipo = models.CharField("tipo de evento", max_length=30, choices=TipoEventoTimeline.choices)
    descricao = models.CharField("descrição", max_length=255)
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField("timestamp", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "shm_timeline_event"
        ordering = ["-timestamp"]

class Notification(TimeStampedModel):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notificacoes")
    titulo = models.CharField("título", max_length=200)
    mensagem = models.TextField("mensagem")
    url = models.CharField("link de redirecionamento", max_length=255, blank=True, null=True)
    lida = models.BooleanField("lida", default=False, db_index=True)

    class Meta:
        db_table = "shm_notification"
        ordering = ["-criado_em"]