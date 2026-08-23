from django.db import models
from django.core.exceptions import ValidationError
from apps.core.models import TimeStampedModel

class TipoCliente(models.TextChoices):
    PF = "PF", "Pessoa Física"
    PJ = "PJ", "Pessoa Jurídica"

class StatusCliente(models.TextChoices):
    ATIVO = "ativo", "Ativo"
    INATIVO = "inativo", "Inativo"

class Cliente(TimeStampedModel):
    tipo = models.CharField("tipo", max_length=2, choices=TipoCliente.choices, default=TipoCliente.PJ, db_index=True)
    razao_social = models.CharField("razão social", max_length=200, blank=True, null=True)
    nome_fantasia = models.CharField("nome fantasia", max_length=200, blank=True, null=True)
    cnpj = models.CharField("CNPJ", max_length=14, blank=True, null=True, db_index=True)
    nome_completo = models.CharField("nome completo", max_length=200, blank=True, null=True)
    cpf = models.CharField("CPF", max_length=11, blank=True, null=True, db_index=True)
    rg = models.CharField("RG", max_length=20, blank=True, null=True)
    data_nascimento = models.DateField("data de nascimento", blank=True, null=True)
    email_contato = models.EmailField("e-mail de contato", max_length=254)
    telefone = models.CharField("telefone", max_length=20, blank=True, null=True)
    pessoa_contato = models.CharField("pessoa de contato", max_length=150, blank=True, null=True)
    cep = models.CharField("CEP", max_length=8, blank=True, null=True)
    logradouro = models.CharField("logradouro", max_length=200, blank=True, null=True)
    numero = models.CharField("número", max_length=20, blank=True, null=True)
    complemento = models.CharField("complemento", max_length=100, blank=True, null=True)
    bairro = models.CharField("bairro", max_length=100, blank=True, null=True)
    cidade = models.CharField("cidade", max_length=100, blank=True, null=True)
    estado = models.CharField("UF", max_length=2, blank=True, null=True)
    status = models.CharField("status", max_length=10, choices=StatusCliente.choices, default=StatusCliente.ATIVO, db_index=True)

    class Meta:
        db_table = "shm_cliente"
        ordering = ["-criado_em"]
        verbose_name = "cliente"
        verbose_name_plural = "clientes"

    def __str__(self):
        if self.tipo == TipoCliente.PJ:
            return self.nome_fantasia or self.razao_social or f"PJ #{self.id}"
        return self.nome_completo or f"PF #{self.id}"

    def clean(self):
        if self.tipo == TipoCliente.PJ:
            if not self.razao_social:
                raise ValidationError({"razao_social": "Razão social é obrigatória para Pessoa Jurídica."})
            if not self.cnpj:
                raise ValidationError({"cnpj": "CNPJ é obrigatório para Pessoa Jurídica."})
        elif self.tipo == TipoCliente.PF:
            if not self.nome_completo:
                raise ValidationError({"nome_completo": "Nome completo é obrigatório para Pessoa Física."})
            if not self.cpf:
                raise ValidationError({"cpf": "CPF é obrigatório para Pessoa Física."})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)