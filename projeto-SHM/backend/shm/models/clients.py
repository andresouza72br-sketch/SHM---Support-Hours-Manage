import uuid

from django.db import models


class Cliente(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    razao_social = models.CharField("Razão Social", max_length=255)
    nome_fantasia = models.CharField("Nome Fantasia", max_length=255)
    cnpj = models.CharField("CNPJ", max_length=18, unique=True)
    email_contato = models.EmailField("E-mail de Contato")
    telefone = models.CharField("Telefone", max_length=30, blank=True, default="")
    ativo = models.BooleanField("Ativo", default=True)
    created_at = models.DateTimeField("Criado em", auto_now_add=True)
    updated_at = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["nome_fantasia"]

    def __str__(self) -> str:
        return self.nome_fantasia or self.razao_social
