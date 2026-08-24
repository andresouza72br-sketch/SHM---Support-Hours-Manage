from django.contrib import admin
from .models import Cliente

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ["__str__", "tipo", "cnpj", "cpf", "email_contato", "status", "criado_em"]
    list_filter = ["tipo", "status", "estado"]
    search_fields = ["razao_social", "nome_fantasia", "nome_completo", "cnpj", "cpf", "email_contato"]
    ordering = ["razao_social", "nome_completo"]
