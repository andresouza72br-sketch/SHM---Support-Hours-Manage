from django.contrib import admin
from apps.schedule.models import Agendamento, ParticipanteAgendamento, LembreteAgendamento

class ParticipanteInline(admin.TabularInline):
    model = ParticipanteAgendamento
    extra = 1

class LembreteInline(admin.TabularInline):
    model = LembreteAgendamento
    extra = 0
    readonly_fields = ("marco", "data_prevista", "status", "disparado_em")

@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "cliente", "tipo", "status", "data_inicio", "duracao_minutos", "google_sincronizado", "criado_em")
    list_filter = ("status", "tipo", "google_sincronizado", "cliente")
    search_fields = ("titulo", "descricao", "google_event_id", "google_meet_link")
    inlines = [ParticipanteInline, LembreteInline]

@admin.register(ParticipanteAgendamento)
class ParticipanteAdmin(admin.ModelAdmin):
    list_display = ("nome", "email", "agendamento", "tipo", "status_presenca")
    list_filter = ("tipo", "status_presenca")
    search_fields = ("nome", "email")

@admin.register(LembreteAgendamento)
class LembreteAdmin(admin.ModelAdmin):
    list_display = ("agendamento", "marco", "status", "data_prevista", "disparado_em")
    list_filter = ("marco", "status")
