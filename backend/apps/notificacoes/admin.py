from django.contrib import admin
from .models import TimelineEvent, Notification

@admin.register(TimelineEvent)
class TimelineEventAdmin(admin.ModelAdmin):
    list_display = ["pedido", "ciclo", "tipo", "descricao", "autor", "timestamp"]
    list_filter = ["tipo", "timestamp"]
    search_fields = ["descricao", "pedido__protocolo"]
    date_hierarchy = "timestamp"

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["usuario", "titulo", "lida", "criado_em"]
    list_filter = ["lida", "criado_em"]
    search_fields = ["titulo", "mensagem", "usuario__username"]
