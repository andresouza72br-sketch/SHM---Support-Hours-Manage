from django.contrib import admin
from .models import Ciclo, AvaliacaoCiclo


@admin.register(Ciclo)
class CicloAdmin(admin.ModelAdmin):
    list_display = ["id", "pedido", "tipo", "operador", "status", "horas_estimadas", "horas_realizadas", "criado_em"]
    list_filter = ["tipo", "status", "operador"]
    search_fields = ["pedido__protocolo", "pedido__assunto", "contexto"]
    date_hierarchy = "criado_em"


@admin.register(AvaliacaoCiclo)
class AvaliacaoCicloAdmin(admin.ModelAdmin):
    list_display = ["ciclo", "avaliador", "nota", "criado_em"]
    list_filter = ["nota"]
    search_fields = ["ciclo__id", "avaliador__username", "comentario"]
    date_hierarchy = "criado_em"
