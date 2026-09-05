import logging
from django.core.management.base import BaseCommand
from apps.schedule.services import ScheduleService

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Varre e dispara lembretes de agendamentos pendentes nos 3 marcos (24h, 30m, 15m) com idempotência."

    def handle(self, *args, **options):
        self.stdout.write("Iniciando varredura de lembretes pendentes de agendamento...")
        total = ScheduleService.processar_lembretes_pendentes()
        if total > 0:
            self.stdout.write(self.style.SUCCESS(f"Sucesso! {total} lembrete(s) de agendamento disparado(s)."))
        else:
            self.stdout.write("Nenhum lembrete com disparo pendente para este ciclo.")
