from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from shm.models import (
    Ciclo,
    Cliente,
    ComentarioTimeline,
    Contrato,
    Pedido,
    SaldoTransferido,
    Tarefa,
    Usuario,
)


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ["nome_fantasia", "razao_social", "cnpj", "email_contato", "ativo"]
    search_fields = ["nome_fantasia", "razao_social", "cnpj"]
    list_filter = ["ativo"]


@admin.register(Usuario)
class UsuarioCustomAdmin(UserAdmin):
    list_display = ["email", "nome_completo", "tipo_perfil", "cliente", "is_active"]
    search_fields = ["email", "nome_completo"]
    list_filter = ["tipo_perfil", "is_active", "cliente"]
    ordering = ["email"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Informações Pessoais",
            {"fields": ("nome_completo", "telefone", "tipo_perfil", "cliente")},
        ),
        (
            "Permissões",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Datas Importantes", {"fields": ("last_login", "date_joined")}),
    )


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = [
        "numero_contrato",
        "cliente",
        "data_inicio",
        "data_fim",
        "horas_contratadas",
        "horas_herdadas",
        "horas_consumidas",
        "saldo_horas",
        "status",
    ]
    list_filter = ["status", "cliente"]
    search_fields = ["numero_contrato", "cliente__nome_fantasia"]


@admin.register(SaldoTransferido)
class SaldoTransferidoAdmin(admin.ModelAdmin):
    list_display = [
        "contrato_origem",
        "contrato_destino",
        "horas_transferidas",
        "data_transferencia",
        "usuario_responsavel",
    ]
    search_fields = [
        "contrato_origem__numero_contrato",
        "contrato_destino__numero_contrato",
    ]


class TarefaInline(admin.TabularInline):
    model = Tarefa
    extra = 1


@admin.register(Ciclo)
class CicloAdmin(admin.ModelAdmin):
    list_display = [
        "codigo",
        "pedido",
        "titulo_contexto",
        "tipo_manutencao",
        "horas_estimadas_total",
        "horas_realizadas_total",
        "status",
    ]
    list_filter = ["status", "tipo_manutencao"]
    search_fields = ["codigo", "titulo_contexto"]
    inlines = [TarefaInline]


class CicloInline(admin.StackedInline):
    model = Ciclo
    extra = 0
    show_change_link = True


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = [
        "codigo",
        "cliente",
        "contrato",
        "solicitante",
        "titulo",
        "status",
        "created_at",
    ]
    list_filter = ["status", "cliente"]
    search_fields = ["codigo", "titulo"]
    inlines = [CicloInline]


@admin.register(ComentarioTimeline)
class ComentarioTimelineAdmin(admin.ModelAdmin):
    list_display = [
        "tipo_evento",
        "pedido",
        "ciclo",
        "autor",
        "horas_contexto",
        "created_at",
    ]
    list_filter = ["tipo_evento"]
    search_fields = ["conteudo"]
