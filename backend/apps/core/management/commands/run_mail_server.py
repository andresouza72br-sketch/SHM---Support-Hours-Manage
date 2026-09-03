import asyncio
import sys
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings

# Importa o dev_mail_server a partir de tools/mail-server
_mail_server_path = Path(settings.BASE_DIR).parent / "tools" / "mail-server"
if str(_mail_server_path) not in sys.path:
    sys.path.insert(0, str(_mail_server_path))

from dev_mail_server import main as run_server


class Command(BaseCommand):
    help = "Inicia o servidor SMTP local (porta 1025) e o painel Web de e-mails (http://localhost:8025) para testes."

    def handle(self, *args, **options):
        try:
            asyncio.run(run_server())
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS("\n[Servidor de e-mails de teste encerrado com sucesso]"))
