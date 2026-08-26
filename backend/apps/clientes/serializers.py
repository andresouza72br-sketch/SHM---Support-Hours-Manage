from rest_framework import serializers
from django.db.models import Sum
from apps.clientes.models import Cliente, validar_cnpj, validar_cpf
from apps.accounts.models import User, UserRole

class ClienteUserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    can_approve_cycles = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "avatar_url",
            "role",
            "role_display",
            "telefone",
            "cliente",
            "is_active",
            "can_approve_cycles",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "can_approve_cycles", "role_display"]


class ClienteUserCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(max_length=150, required=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    role = serializers.ChoiceField(
        choices=[(UserRole.CLIENTE_GERENTE, "Gerente / Tomador"), (UserRole.CLIENTE_ANALISTA, "Analista / Operacional")],
        default=UserRole.CLIENTE_ANALISTA,
    )
    telefone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")

    def validate_email(self, value):
        email_clean = value.strip().lower()
        if User.objects.filter(email__iexact=email_clean).exists():
            raise serializers.ValidationError("Já existe um usuário cadastrado com este endereço de e-mail.")
        return email_clean


class ClienteUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "role", "telefone", "is_active"]

    def validate_role(self, value):
        if value not in (UserRole.CLIENTE_GERENTE, UserRole.CLIENTE_ANALISTA):
            raise serializers.ValidationError("O perfil do usuário deve ser Cliente — Gerente ou Cliente — Analista.")
        return value


class ClienteSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    total_contratos = serializers.SerializerMethodField()
    contratos_ativos = serializers.SerializerMethodField()
    total_usuarios = serializers.SerializerMethodField()
    saldo_total_horas = serializers.SerializerMethodField()
    aceite_token = serializers.SerializerMethodField()
    aceite_expira_em = serializers.SerializerMethodField()
    aceite_usado = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = "__all__"
        read_only_fields = [
            "id",
            "email_verificado",
            "email_verificado_em",
            "aprovado_em",
            "aprovado_por_nome",
            "aprovado_por_email",
            "aprovado_ip",
            "aprovado_user_agent",
            "criado_em",
            "atualizado_em",
        ]

    def get_display_name(self, obj):
        return str(obj)

    def get_logo_url(self, obj):
        if obj.logo and hasattr(obj.logo, "url"):
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

    def get_total_contratos(self, obj) -> int:
        return obj.contratos.count() if hasattr(obj, "contratos") else 0

    def get_contratos_ativos(self, obj) -> int:
        return obj.contratos.filter(status="ativo").count() if hasattr(obj, "contratos") else 0

    def get_total_usuarios(self, obj) -> int:
        return obj.usuarios.filter(is_active=True).count() if hasattr(obj, "usuarios") else 0

    def get_saldo_total_horas(self, obj) -> float:
        if hasattr(obj, "contratos"):
            res = obj.contratos.filter(status="ativo").aggregate(total=Sum("saldo"))
            return float(res["total"] or 0)
        return 0.0

    def get_aceite_token(self, obj):
        link = obj.aceite_links.order_by("-criado_em").first()
        return str(link.token) if link else None

    def get_aceite_expira_em(self, obj):
        link = obj.aceite_links.order_by("-criado_em").first()
        return link.data_expiracao.isoformat() if link else None

    def get_aceite_usado(self, obj):
        link = obj.aceite_links.order_by("-criado_em").first()
        return link.usado if link else False

    def validate(self, attrs):
        tipo = attrs.get("tipo", getattr(self.instance, "tipo", None))
        cnpj = attrs.get("cnpj", getattr(self.instance, "cnpj", None))
        cpf = attrs.get("cpf", getattr(self.instance, "cpf", None))
        razao_social = attrs.get("razao_social", getattr(self.instance, "razao_social", None))
        nome_completo = attrs.get("nome_completo", getattr(self.instance, "nome_completo", None))

        if tipo == "PJ":
            if not razao_social:
                raise serializers.ValidationError({"razao_social": "Razão Social é obrigatória para Pessoa Jurídica."})
            if not cnpj:
                raise serializers.ValidationError({"cnpj": "CNPJ é obrigatório para Pessoa Jurídica."})
            if not validar_cnpj(cnpj):
                raise serializers.ValidationError({"cnpj": "O CNPJ informado é inválido."})
        elif tipo == "PF":
            if not nome_completo:
                raise serializers.ValidationError({"nome_completo": "Nome Completo é obrigatório para Pessoa Física."})
            if not cpf:
                raise serializers.ValidationError({"cpf": "CPF é obrigatório para Pessoa Física."})
            if not validar_cpf(cpf):
                raise serializers.ValidationError({"cpf": "O CPF informado é inválido."})

        return attrs


class ClienteAprovacaoDetailSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Cliente
        fields = [
            "id",
            "tipo",
            "tipo_display",
            "display_name",
            "razao_social",
            "nome_fantasia",
            "cnpj",
            "inscricao_estadual",
            "inscricao_municipal",
            "ramo_atividade",
            "nome_completo",
            "cpf",
            "rg",
            "data_nascimento",
            "email_contato",
            "telefone",
            "celular_whatsapp",
            "pessoa_contato",
            "cargo_contato",
            "site_url",
            "cep",
            "logradouro",
            "numero",
            "complemento",
            "bairro",
            "cidade",
            "estado",
            "pais",
            "logo_url",
            "cor_primaria_hex",
            "emails_notificacao_padrao",
            "status",
            "status_display",
            "email_verificado",
            "email_verificado_em",
            "aprovado_em",
            "aprovado_por_nome",
            "aprovado_por_email",
            "criado_em",
        ]

    def get_display_name(self, obj):
        return str(obj)

    def get_logo_url(self, obj):
        if obj.logo and hasattr(obj.logo, "url"):
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None