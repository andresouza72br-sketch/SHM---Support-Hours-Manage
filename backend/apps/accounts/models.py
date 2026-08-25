from django.contrib.auth.models import AbstractUser
from django.db import models

class UserRole(models.TextChoices):
    EMPRESA_ADMIN = "EMPRESA_ADMIN", "Empresa — Gerente / Administrador"
    EMPRESA_TECNICO = "EMPRESA_TECNICO", "Empresa — Técnico / Analista"
    CLIENTE_GERENTE = "CLIENTE_GERENTE", "Cliente — Gerente / Tomador"
    CLIENTE_ANALISTA = "CLIENTE_ANALISTA", "Cliente — Analista / Usuário"

class User(AbstractUser):
    role = models.CharField(
        "perfil de acesso",
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CLIENTE_GERENTE,
        db_index=True,
    )
    telefone = models.CharField("telefone", max_length=20, blank=True, null=True)
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="usuarios",
        verbose_name="empresa / cliente vinculado",
    )

    class Meta:
        db_table = "shm_user"
        verbose_name = "usuário"
        verbose_name_plural = "usuários"

    def __str__(self):
        nome = self.get_full_name() or self.username
        return f"{nome} ({self.get_role_display()})"

    @property
    def is_empresa(self) -> bool:
        return self.role in (UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO) or self.is_superuser

    @property
    def is_cliente(self) -> bool:
        return self.role in (UserRole.CLIENTE_GERENTE, UserRole.CLIENTE_ANALISTA)

    @property
    def can_approve_cycles(self) -> bool:
        return self.role == UserRole.CLIENTE_GERENTE or self.is_superuser

class PasswordlessLoginToken(models.Model):
    import uuid
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="magic_login_tokens", verbose_name="usuário")
    token = models.UUIDField("token de acesso", default=uuid.uuid4, unique=True, db_index=True, editable=False)
    expira_em = models.DateTimeField("expira em", db_index=True)
    usado = models.BooleanField("usado", default=False, db_index=True)
    usado_em = models.DateTimeField("usado em", null=True, blank=True)
    ip_origem = models.GenericIPAddressField("IP de origem", null=True, blank=True)
    user_agent = models.TextField("User-Agent", null=True, blank=True)
    criado_em = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        db_table = "shm_passwordless_login_token"
        ordering = ["-criado_em"]
        verbose_name = "token de login sem senha"
        verbose_name_plural = "tokens de login sem senha"

    def esta_expirado(self) -> bool:
        from django.utils import timezone
        return timezone.now() > self.expira_em

    def __str__(self):
        return f"Login Magic Link ({self.user.email}) [Usado: {self.usado}]"