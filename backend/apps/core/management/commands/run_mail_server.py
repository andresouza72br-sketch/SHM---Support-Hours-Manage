import asyncio
from django.core.management.base import BaseCommand
from dev_mail_server import main as run_server


class Command(BaseCommand):
    help = "Inicia o servidor SMTP local (porta 1025) e o painel Web de e-mails (http://localhost:8025) para testes."

    def handle(self, *args, **options):
        try:
            asyncio.run(run_server())
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS("\n[Servidor de e-mails de teste encerrado com sucesso]"))
