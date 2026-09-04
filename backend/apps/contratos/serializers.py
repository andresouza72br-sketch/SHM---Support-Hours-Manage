from rest_framework import serializers
from apps.contratos.models import (
    Contrato,
    ContratoPDF,
    ContratoDocumento,
    ContratoAuditLog,
    AceiteLink,
    TipoDocumentoContrato,
    ContratoEmailNotificacao,
    ForensicAuditLog,
    AuditDailySeal,
)

class ContratoPDFSerializer(serializers.ModelSerializer):
    url = serializers.FileField(source="arquivo", read_only=True)

    class Meta:
        model = ContratoPDF
        fields = ["id", "nome_original", "url", "criado_em"]

class ContratoDocumentoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    tipo_documento_display = serializers.CharField(source="get_tipo_documento_display", read_only=True)
    tamanho_formatado = serializers.SerializerMethodField()
    enviado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = ContratoDocumento
        fields = [
            "id",
            "nome_original",
            "tipo_documento",
            "tipo_documento_display",
            "tamanho_bytes",
            "tamanho_formatado",
            "hash_sha256",
            "algoritmo_hash",
            "url",
            "enviado_por",
            "enviado_por_nome",
            "criado_em",
        ]
        read_only_fields = ["id", "tamanho_bytes", "hash_sha256", "algoritmo_hash", "enviado_por", "criado_em"]

    def get_url(self, obj):
        if obj.arquivo and hasattr(obj.arquivo, "url"):
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.arquivo.url)
            return obj.arquivo.url
        return ""

    def get_tamanho_formatado(self, obj):
        bytes_val = obj.tamanho_bytes or 0
        if bytes_val < 1024:
            return f"{bytes_val} B"
        elif bytes_val < 1024 * 1024:
            return f"{bytes_val / 1024:.1f} KB"
        return f"{bytes_val / (1024 * 1024):.1f} MB"

    def get_enviado_por_nome(self, obj):
        if obj.enviado_por:
            return obj.enviado_por.get_full_name() or obj.enviado_por.username
        return None

class ContratoAuditLogSerializer(serializers.ModelSerializer):
    tipo_evento_display = serializers.CharField(source="get_tipo_evento_display", read_only=True)
    usuario_nome = serializers.SerializerMethodField()
    usuario_role = serializers.SerializerMethodField()

    class Meta:
        model = ContratoAuditLog
        fields = [
            "id",
            "contrato",
            "tipo_evento",
            "tipo_evento_display",
            "descricao",
            "justificativa",
            "documento_nome",
            "documento_hash",
            "usuario",
            "usuario_nome",
            "usuario_role",
            "ip_origem",
            "timestamp",
        ]
        read_only_fields = ["id", "timestamp"]

    def get_usuario_nome(self, obj):
        if obj.usuario:
            return obj.usuario.get_full_name() or obj.usuario.username
        return "Sistema / Público"

    def get_usuario_role(self, obj):
        if obj.usuario:
            return obj.usuario.get_role_display()
        return None

class ContratoEmailNotificacaoSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    convidado_por_nome = serializers.SerializerMethodField()
    is_expirado = serializers.BooleanField(read_only=True)
    dias_restantes = serializers.IntegerField(read_only=True)

    class Meta:
        model = ContratoEmailNotificacao
        fields = [
            "id",
            "contrato",
            "email",
            "nome",
            "ativo",
            "status",
            "status_display",
            "token",
            "convidado_por",
            "convidado_por_nome",
            "convidado_em",
            "expira_em",
            "confirmado_em",
            "is_expirado",
            "dias_restantes",
        ]
        read_only_fields = ["id", "token", "convidado_em", "confirmado_em"]

    def get_convidado_por_nome(self, obj):
        if obj.convidado_por:
            return obj.convidado_por.get_full_name() or obj.convidado_por.username
        return "Sistema"

class ContratoSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.SerializerMethodField()
    cliente_logo = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    em_carencia = serializers.BooleanField(read_only=True)
    saldo_devedor = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    saldo_remanescente = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    cancelado_por_nome = serializers.SerializerMethodField()
    concluido_por_nome = serializers.SerializerMethodField()
    criado_por_nome = serializers.SerializerMethodField()
    total_documentos = serializers.SerializerMethodField()
    documentos = ContratoDocumentoSerializer(many=True, read_only=True)
    destinatarios = ContratoEmailNotificacaoSerializer(source="destinatarios_notificacao", many=True, read_only=True)
    pdfs = ContratoPDFSerializer(many=True, read_only=True)
    aceite_token = serializers.SerializerMethodField()
    aceite_expira_em = serializers.SerializerMethodField()
    aceite_usado = serializers.SerializerMethodField()
    creditos_migrados = serializers.SerializerMethodField()
    debitos_compensados = serializers.SerializerMethodField()

    class Meta:
        model = Contrato
        fields = "__all__"
        read_only_fields = [
            "id",
            "numero",
            "saldo",
            "horas_consumidas",
            "criado_por",
            "cancelado_por",
            "cancelado_em",
            "concluido_por",
            "concluido_em",
            "criado_em",
            "atualizado_em",
        ]

    def get_cliente_nome(self, obj):
        if obj.cliente:
            return obj.cliente.nome_fantasia or obj.cliente.razao_social or str(obj.cliente)
        return ""

    def get_cliente_logo(self, obj):
        if obj.cliente and obj.cliente.logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.cliente.logo.url)
            return obj.cliente.logo.url
        return None

    def get_cancelado_por_nome(self, obj):
        if obj.cancelado_por:
            return obj.cancelado_por.get_full_name() or obj.cancelado_por.username
        return None

    def get_concluido_por_nome(self, obj):
        if obj.concluido_por:
            return obj.concluido_por.get_full_name() or obj.concluido_por.username
        return None

    def get_criado_por_nome(self, obj):
        if obj.criado_por:
            return obj.criado_por.get_full_name() or obj.criado_por.username
        return None

    def get_total_documentos(self, obj):
        return obj.documentos.count() if hasattr(obj, "documentos") else 0

    def get_aceite_token(self, obj):
        link = obj.aceite_links.order_by("-criado_em").first()
        return str(link.token) if link else None

    def get_aceite_expira_em(self, obj):
        link = obj.aceite_links.order_by("-criado_em").first()
        return link.data_expiracao.isoformat() if link else None

    def get_aceite_usado(self, obj):
        link = obj.aceite_links.order_by("-criado_em").first()
        return link.usado if link else False

    def get_creditos_migrados(self, obj):
        from apps.saldo.models import HistoricoSaldo, TipoOperacaoSaldo
        from django.db.models import Sum
        total = (
            HistoricoSaldo.objects.filter(
                contrato=obj,
                tipo_operacao__in=[TipoOperacaoSaldo.TRANSFERENCIA_RECEBIMENTO, TipoOperacaoSaldo.REABASTECIMENTO],
            ).aggregate(total=Sum("quantidade"))["total"]
            or 0
        )
        return float(total)

    def get_debitos_compensados(self, obj):
        from apps.saldo.models import HistoricoSaldo, TipoOperacaoSaldo
        from django.db.models import Sum
        total = (
            HistoricoSaldo.objects.filter(
                contrato=obj,
                tipo_operacao=TipoOperacaoSaldo.TRANSFERENCIA_ENVIO,
            ).aggregate(total=Sum("quantidade"))["total"]
            or 0
        )
        return float(abs(total))


class ForensicAuditLogSerializer(serializers.ModelSerializer):
    tipo_evento_display = serializers.CharField(source="get_tipo_evento_display", read_only=True)

    class Meta:
        model = ForensicAuditLog
        fields = [
            "id",
            "sequencia",
            "tipo_evento",
            "tipo_evento_display",
            "nivel_relevancia",
            "descricao",
            "justificativa",
            "usuario_nome",
            "usuario_role",
            "ip_origem",
            "user_agent",
            "timestamp",
            "payload_hash",
            "previous_hash",
            "current_hash",
            "particao",
            "contrato",
            "cliente",
        ]
        read_only_fields = fields


class AuditDailySealSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditDailySeal
        fields = [
            "id",
            "data_referencia",
            "particao",
            "ultimo_registro_id",
            "ultima_sequencia",
            "ultimo_hash",
            "total_eventos_dia",
            "selo_digest",
            "selado_em",
        ]
        read_only_fields = fields