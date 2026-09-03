from django.contrib import admin
from .models import Cliente, ClienteAceiteLink, ClienteAuditLog

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ["__str__", "tipo", "cnpj", "cpf", "email_contato", "status", "email_verificado", "criado_em"]
    list_filter = ["tipo", "status", "email_verificado", "estado"]
    search_fields = ["razao_social", "nome_fantasia", "nome_completo", "cnpj", "cpf", "email_contato"]
    ordering = ["razao_social", "nome_completo"]

@admin.register(ClienteAceiteLink)
class ClienteAceiteLinkAdmin(admin.ModelAdmin):
    list_display = ["token", "cliente", "data_expiracao", "usado", "usado_em", "usado_ip"]
    list_filter = ["usado"]
    search_fields = ["token", "cliente__razao_social", "cliente__nome_fantasia", "cliente__nome_completo"]

@admin.register(ClienteAuditLog)
class ClienteAuditLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "tipo_evento", "cliente_nome", "cliente_documento", "usuario_nome", "ip_origem"]
    list_filter = ["tipo_evento", "timestamp"]
    search_fields = ["cliente_nome", "cliente_documento", "descricao", "justificativa", "usuario_nome", "usuario_email"]
    readonly_fields = [f.name for f in ClienteAuditLog._meta.fields]

