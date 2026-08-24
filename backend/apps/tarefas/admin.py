from django.contrib import admin
from .models import Tarefa

@admin.register(Tarefa)
class TarefaAdmin(admin.ModelAdmin):
    list_display = ["id", "ciclo", "descricao", "horas_estimadas", "horas_realizadas", "status", "operador"]
    list_filter = ["status", "operador"]
    search_fields = ["descricao", "ciclo__pedido__protocolo"]
