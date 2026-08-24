from django.contrib import admin
from .models import Comentario, AnexoComentario

class AnexoComentarioInline(admin.TabularInline):
    model = AnexoComentario
    extra = 1

@admin.register(Comentario)
class ComentarioAdmin(admin.ModelAdmin):
    list_display = ["id", "ciclo", "tarefa", "autor", "texto_curto", "criado_em"]
    list_filter = ["autor", "criado_em"]
    search_fields = ["texto", "autor__username"]
    inlines = [AnexoComentarioInline]

    def texto_curto(self, obj):
        return obj.texto[:50]
    texto_curto.short_description = "Texto"

@admin.register(AnexoComentario)
class AnexoComentarioAdmin(admin.ModelAdmin):
    list_display = ["comentario", "nome_original", "tamanho", "criado_em"]
