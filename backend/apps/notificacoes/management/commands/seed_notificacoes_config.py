from django.core.management.base import BaseCommand
from apps.notificacoes.config_service import NotificacaoConfigService
from apps.notificacoes.models import ConfiguracaoNotificacao

class Command(BaseCommand):
    help = "Popula ou atualiza as configurações padrão de e-mail e notificações do SHM."

    def handle(self, *args, **options):
        self.stdout.write("Sincronizando configurações padrão de notificações...")
        NotificacaoConfigService.garantir_configuracoes_padrao()
        total = ConfiguracaoNotificacao.objects.count()
        self.stdout.write(self.style.SUCCESS(f"Sucesso! {total} configurações de eventos de notificação registradas no banco."))
