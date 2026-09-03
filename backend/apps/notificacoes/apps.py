import os
import sys
import logging
import threading
from django.apps import AppConfig

logger = logging.getLogger(__name__)

class NotificacoesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notificacoes'

    def ready(self):
        # Evita execução durante testes, comandos de gestão de schema e migrações
        from django.conf import settings
        if getattr(settings, 'IS_TESTING', False):
            return

        ignorar_comandos = {'migrate', 'makemigrations', 'collectstatic', 'test'}
        args_atuais = set(sys.argv)
        if any(cmd in args_atuais for cmd in ignorar_comandos):
            return

        # No runserver com autoreload do Django, executa apenas no processo worker real (RUN_MAIN == 'true')
        is_runserver = any('runserver' in arg for arg in sys.argv)
        if is_runserver and os.environ.get('RUN_MAIN') != 'true':
            return

        # Dispara thread em segundo plano para não postergar a vinculação das portas HTTP
        threading.Thread(
            target=self._executar_automacoes_inicializacao,
            daemon=True,
            name="shm-notificacoes-startup-thread",
        ).start()

    def _executar_automacoes_inicializacao(self):
        import time
        # Pequeno delay para garantir que o Django e as conexões com o banco estejam 100% estabilizadas
        time.sleep(1.5)

        logger.info("[STARTUP] Executando rotinas automáticas de notificações...")

        # 1. Garantir configurações padrão no banco
        try:
            from apps.notificacoes.config_service import NotificacaoConfigService
            NotificacaoConfigService.garantir_configuracoes_padrao()
            logger.info("[STARTUP] Configurações de notificação sincronizadas com sucesso.")
        except Exception as e:
            logger.warning("[STARTUP] Falha ao sincronizar configurações padrão de notificação: %s", e)

        # 2. Verificar contratos com vigência próxima do fim e emitir alertas no startup
        try:
            from django.core.management import call_command
            call_command("verificar_expiracao_contratos")
            logger.info("[STARTUP] Verificação de vigência de contratos inicial concluída com sucesso.")
        except Exception as e:
            logger.warning("[STARTUP] Falha ao verificar vigência de contratos no startup: %s", e)

        # 3. Iniciar loop do agendador diário (cron embutido às 08:00 AM)
        self._loop_agendador_diario()

    def _loop_agendador_diario(self):
        import time
        from datetime import timedelta
        from django.utils import timezone

        logger.info("[CRON-NOTIF] Agendador diário de vigência ativado (disparos diários às 08:00 AM).")

        while True:
            agora = timezone.localtime()
            # Próximo disparo: 08:00:00 no fuso configurado (America/Sao_Paulo)
            proximo_disparo = agora.replace(hour=8, minute=0, second=0, microsecond=0)
            if agora >= proximo_disparo:
                proximo_disparo += timedelta(days=1)

            segundos_espera = (proximo_disparo - agora).total_seconds()
            logger.info(
                "[CRON-NOTIF] Próxima verificação de vigência agendada para %s (em %.1f horas).",
                proximo_disparo.strftime("%d/%m/%Y %H:%M:%S"),
                segundos_espera / 3600.0,
            )

            # Aguarda até o horário alvo em intervalos curtos
            while segundos_espera > 0:
                dormir = min(segundos_espera, 30.0)
                time.sleep(dormir)
                agora = timezone.localtime()
                segundos_espera = (proximo_disparo - agora).total_seconds()

            logger.info("[CRON-NOTIF] 08:00 AM atingido. Executando verificação diária de vigência de contratos...")
            try:
                from django.core.management import call_command
                call_command("verificar_expiracao_contratos")
                logger.info("[CRON-NOTIF] Verificação diária de vigência concluída com sucesso.")
            except Exception as e:
                logger.error("[CRON-NOTIF] Falha na execução da verificação diária de vigência: %s", e)

            # Pausa de segurança de 5 segundos para ultrapassar o marco antes do próximo cálculo
            time.sleep(5)