from django.contrib import admin
from .models import Contrato, ContratoPDF, AceiteLink

class ContratoPDFInline(admin.TabularInline):
    model = ContratoPDF
    extra = 1

class AceiteLinkInline(admin.TabularInline):
    model = AceiteLink
    extra = 0
    readonly_fields = ["token", "data_expiracao", "usado", "usado_em"]

@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = ["numero", "cliente", "tipo", "data_inicio", "data_termino", "horas_contratadas", "saldo", "horas_consumidas", "status"]
    list_filter = ["tipo", "status", "data_inicio"]
    search_fields = ["numero", "cliente__razao_social", "cliente__nome_fantasia", "cliente__nome_completo"]
    inlines = [ContratoPDFInline, AceiteLinkInline]
    date_hierarchy = "data_inicio"

@admin.register(ContratoPDF)
class ContratoPDFAdmin(admin.ModelAdmin):
    list_display = ["contrato", "nome_original", "criado_em"]

@admin.register(AceiteLink)
class AceiteLinkAdmin(admin.ModelAdmin):
    list_display = ["contrato", "token", "data_expiracao", "usado", "usado_em"]
    list_filter = ["usado"]
