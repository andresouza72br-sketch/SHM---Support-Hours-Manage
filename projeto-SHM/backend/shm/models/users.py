import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

from .clients import Cliente


class UsuarioManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("O e-mail é obrigatório.")
        email = self.normalize_email(email)
        user = self.model(email=email, username=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("tipo_perfil", Usuario.TipoPerfil.ADMIN_EMPRESA)

        return self.create_user(email, password, **extra_fields)


class Usuario(AbstractUser):
    class TipoPerfil(models.TextChoices):
        ADMIN_EMPRESA = "ADMIN_EMPRESA", "Administrador da Empresa"
        GESTOR_SUPORTE = "GESTOR_SUPORTE", "Gestor de Suporte"
        TECNICO = "TECNICO", "Técnico Especialista"
        GESTOR_CLIENTE = "GESTOR_CLIENTE", "Gestor do Cliente"
        USUARIO_CLIENTE = "USUARIO_CLIENTE", "Usuário do Cliente"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField("E-mail", unique=True)
    nome_completo = models.CharField("Nome Completo", max_length=255)
    telefone = models.CharField("Telefone", max_length=30, blank=True, default="")
    tipo_perfil = models.CharField(
        "Tipo de Perfil",
        max_length=30,
        choices=TipoPerfil.choices,
        default=TipoPerfil.USUARIO_CLIENTE,
    )
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="usuarios",
        verbose_name="Cliente Vinculado",
        help_text="Preenchido somente para usuários pertencentes a um cliente.",
    )

    objects = UsuarioManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nome_completo"]

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.nome_completo} ({self.get_tipo_perfil_display()})"

    @property
    def is_empresa(self) -> bool:
        return self.tipo_perfil in {
            self.TipoPerfil.ADMIN_EMPRESA,
            self.TipoPerfil.GESTOR_SUPORTE,
            self.TipoPerfil.TECNICO,
        }

    @property
    def is_cliente(self) -> bool:
        return self.tipo_perfil in {
            self.TipoPerfil.GESTOR_CLIENTE,
            self.TipoPerfil.USUARIO_CLIENTE,
        }
