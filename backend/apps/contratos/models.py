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
    CONCLUIDO = "concluido", "Concluído"
    CANCELADO = "cancelado", "Cancelado"
    SUSPENSO = "suspenso", "Suspenso"
    EXPIRADO = "expirado", "Expirado"

class TipoContrato(models.TextChoices):
    NOVO = "novo", "Novo"
    ADITIVO = "aditivo", "Aditivo"
    RENOVACAO = "renovacao", "Renovação"

class TipoDocumentoContrato(models.TextChoices):
    PROPOSTA = "proposta", "Proposta Comercial"
    CONTRATO_ASSINADO = "contrato_assinado", "Contrato Assinado"
    ADITIVO = "aditivo", "Termo Aditivo"
    DISTRATO = "distrato", "Distrato / Rescisão"
    OUTRO = "outro", "Outro Documento"

class StatusConfirmacaoEmail(models.TextChoices):
    PENDENTE = "pendente", "Pendente de Confirmação"
    CONFIRMADO = "confirmado", "Confirmado / Ativo"
    RECUSADO = "recusado", "Recusado pelo Destinatário"
    EXPIRADO = "expirado", "Expirado"

class TipoEventoContratoAudit(models.TextChoices):
    CRIACAO = "criacao", "Criação de Contrato"
    ACEITE = "aceite", "Aceite Formalizado"
    ALTERACAO = "alteracao", "Alteração Cadastral"
    CONCLUSAO = "conclusao", "Contrato Concluído"
    CANCELAMENTO = "cancelamento", "Contrato Cancelado"
    UPLOAD_DOCUMENTO = "upload_documento", "Upload de Documento"
    DOWNLOAD_DOCUMENTO = "download_documento", "Download de Documento"
    EXCLUSAO_DOCUMENTO = "exclusao_documento", "Exclusão de Documento"
    ATUALIZACAO_EMAILS = "atualizacao_emails", "Atualização de E-mails de Notificação"
    CONVITE_EMAIL = "convite_email", "Convite de E-mail de Notificação"
    CONFIRMACAO_EMAIL = "confirmacao_email", "Confirmação de E-mail de Notificação"
    RECUSA_EMAIL = "recusa_email", "Recusa de E-mail de Notificação"
    DOWNLOAD_RELATORIO = "download_relatorio", "Download / Impressão de Relatório"

class Contrato(TimeStampedModel):
    numero = models.CharField("número do contrato", max_length=30, unique=True, db_index=True)
    tipo = models.CharField("tipo", max_length=15, choices=TipoContrato.choices, default=TipoContrato.NOVO)
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
    dia_faturamento = models.PositiveSmallIntegerField("dia de faturamento", null=True, blank=True)
    gestor_nome = models.CharField("nome do gestor responsável", max_length=150, blank=True, null=True)
    gestor_email = models.EmailField("e-mail do gestor", blank=True, null=True)
    gestor_telefone = models.CharField("telefone do gestor", max_length=30, blank=True, null=True)
    emails_notificacao = models.JSONField("e-mails para notificação", default=list, blank=True)
    observacoes = models.TextField("observações", blank=True, null=True)
    status = models.CharField("status", max_length=20, choices=StatusContrato.choices, default=StatusContrato.PENDENTE_ACEITE, db_index=True)
    data_aceite = models.DateTimeField("data de aceite", null=True, blank=True)
    justificativa_cancelamento = models.TextField("justificativa de cancelamento", blank=True, null=True)
    cancelado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos_cancelados",
        verbose_name="cancelado por",
    )
    cancelado_em = models.DateTimeField("cancelado em", null=True, blank=True)
    concluido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contratos_concluidos",
        verbose_name="concluído por",
    )
    concluido_em = models.DateTimeField("concluído em", null=True, blank=True)
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

class ContratoDocumento(TimeStampedModel):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="documentos", verbose_name="contrato")
    arquivo = models.FileField("arquivo do documento", upload_to="contratos/documentos/%Y/%m/")
    nome_original = models.CharField("nome original", max_length=255)
    tipo_documento = models.CharField(
        "tipo de documento",
        max_length=30,
        choices=TipoDocumentoContrato.choices,
        default=TipoDocumentoContrato.OUTRO,
    )
    tamanho_bytes = models.BigIntegerField("tamanho em bytes", default=0)
    hash_sha256 = models.CharField("hash SHA-256", max_length=64, blank=True, default="", db_index=True)
    algoritmo_hash = models.CharField("algoritmo de hash", max_length=20, default="SHA-256")
    enviado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documentos_contrato_enviados",
        verbose_name="enviado por",
    )

    class Meta:
        db_table = "shm_contrato_documento"
        ordering = ["-criado_em"]
        verbose_name = "documento do contrato"
        verbose_name_plural = "documentos do contrato"

    def __str__(self):
        return f"{self.nome_original} ({self.get_tipo_documento_display()}) — {self.contrato.numero}"

class ContratoPDF(TimeStampedModel):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="pdfs")
    arquivo = models.FileField("arquivo PDF", upload_to="contratos/%Y/%m/")
    nome_original = models.CharField("nome original", max_length=255)

    class Meta:
        db_table = "shm_contrato_pdf"

class ContratoAuditLog(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="auditoria", verbose_name="contrato")
    tipo_evento = models.CharField("tipo de evento", max_length=40, choices=TipoEventoContratoAudit.choices)
    descricao = models.TextField("descrição do evento")
    justificativa = models.TextField("justificativa / motivo", blank=True, null=True)
    documento_nome = models.CharField("nome do documento", max_length=255, blank=True, null=True)
    documento_hash = models.CharField("hash SHA-256 do documento", max_length=64, blank=True, null=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auditorias_contrato",
        verbose_name="usuário autor",
    )
    ip_origem = models.GenericIPAddressField("IP de origem", null=True, blank=True)
    user_agent = models.TextField("User-Agent", null=True, blank=True)
    timestamp = models.DateTimeField("data e hora", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "shm_contrato_audit_log"
        ordering = ["-timestamp"]
        verbose_name = "registro de auditoria de contrato"
        verbose_name_plural = "registros de auditoria de contrato"

    def __str__(self):
        return f"[{self.timestamp.strftime('%d/%m/%Y %H:%M')}] {self.get_tipo_evento_display()} - {self.contrato.numero}"

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


class ContratoEmailNotificacao(TimeStampedModel):
    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.CASCADE,
        related_name="destinatarios_notificacao",
        verbose_name="contrato",
    )
    email = models.EmailField("endereço de e-mail", db_index=True)
    nome = models.CharField("nome / cargo", max_length=150, blank=True, null=True)
    ativo = models.BooleanField("notificações ativas", default=True)
    status = models.CharField(
        "status de confirmação",
        max_length=20,
        choices=StatusConfirmacaoEmail.choices,
        default=StatusConfirmacaoEmail.PENDENTE,
        db_index=True,
    )
    token = models.UUIDField("token de confirmação", default=uuid.uuid4, unique=True, editable=False)
    convidado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="convites_notificacao_enviados",
        verbose_name="convidado por",
    )
    convidado_em = models.DateTimeField("data do convite", auto_now_add=True)
    expira_em = models.DateTimeField("data de expiração do token")
    confirmado_em = models.DateTimeField("data de confirmação", null=True, blank=True)
    confirmado_ip = models.GenericIPAddressField("IP de confirmação", null=True, blank=True)
    confirmado_user_agent = models.TextField("User-Agent de confirmação", null=True, blank=True)

    class Meta:
        db_table = "shm_contrato_email_notificacao"
        ordering = ["-criado_em"]
        verbose_name = "e-mail de notificação de contrato"
        verbose_name_plural = "e-mails de notificação de contratos"
        constraints = [
            models.UniqueConstraint(fields=["contrato", "email"], name="unique_contrato_email_notificacao")
        ]

    def __str__(self):
        return f"{self.email} ({self.get_status_display()}) — {self.contrato.numero}"

    @property
    def is_expirado(self) -> bool:
        if self.status == StatusConfirmacaoEmail.PENDENTE and self.expira_em:
            return timezone.now() > self.expira_em
        return False

    @property
    def status_calculado(self) -> str:
        if self.is_expirado:
            return StatusConfirmacaoEmail.EXPIRADO
        return self.status

    @property
    def dias_restantes(self) -> int:
        if not self.expira_em:
            return 0
        delta = self.expira_em - timezone.now()
        return max(0, delta.days)