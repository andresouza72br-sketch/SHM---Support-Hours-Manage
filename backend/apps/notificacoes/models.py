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
    ip_origem = models.GenericIPAddressField("IP de origem", null=True, blank=True)
    user_agent = models.TextField("User-Agent", null=True, blank=True)
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


class CategoriaNotificacao(models.TextChoices):
    AUTENTICACAO = "autenticacao", "Autenticação e Acesso"
    CLIENTES = "clientes", "Clientes e Usuários"
    CONTRATOS = "contratos", "Contratos e Vigência"
    SALDO = "saldo", "Saldo e Franquia de Horas"
    PEDIDOS = "pedidos", "Chamados e Pedidos Técnicos"
    CICLOS = "ciclos", "Orçamentos, Execução e Aceites"


class ConfiguracaoNotificacao(TimeStampedModel):
    codigo = models.CharField("código do evento", max_length=60, unique=True, db_index=True)
    categoria = models.CharField("categoria", max_length=30, choices=CategoriaNotificacao.choices, db_index=True)
    nome = models.CharField("nome amigável", max_length=150)
    descricao = models.TextField("descrição detalhada do gatilho")

    # Controles principais
    ativo_email = models.BooleanField("enviar por e-mail", default=True)
    ativo_in_app = models.BooleanField("gerar notificação in-app", default=True)

    # Matriz de destinatários por papel
    notificar_empresa_admin = models.BooleanField("notificar admins da empresa", default=True)
    notificar_empresa_tecnico = models.BooleanField("notificar técnicos da empresa", default=True)
    notificar_cliente_gerente = models.BooleanField("notificar gerentes do cliente", default=True)
    notificar_cliente_comum = models.BooleanField("notificar solicitantes do cliente", default=False)
    notificar_gestor_contrato = models.BooleanField("notificar gestor do contrato", default=True)
    notificar_emails_cc = models.BooleanField("enviar cópia para lista CC do contrato/cliente", default=True)
    nao_enviar_autor = models.BooleanField(
        "não enviar para o autor da ação",
        default=True,
        help_text="Quando ativo, impede o envio de e-mails para o usuário que realizou a ação disparadora.",
    )

    emails_adicionais = models.JSONField("e-mails fixos adicionais", default=list, blank=True)
    bloqueado_edicao = models.BooleanField("evento obrigatório do sistema", default=False)

    class Meta:
        db_table = "shm_configuracao_notificacao"
        ordering = ["categoria", "codigo"]

    def __str__(self):
        return f"[{self.get_categoria_display()}] {self.nome} ({self.codigo})"