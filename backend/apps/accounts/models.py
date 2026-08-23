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