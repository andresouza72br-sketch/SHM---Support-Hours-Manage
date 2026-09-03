import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.contratos.models import Contrato, StatusContrato, ContratoAuditLog, TipoEventoContratoAudit
from apps.notificacoes.services import NotificacaoService

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Verifica contratos ativos próximos da expiração de vigência e dispara notificações transacionais e in-app."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dias",
            nargs="+",
            type=int,
            default=[30, 15, 7],
            help="Lista de dias restantes antes do término para envio de alertas (padrão: 30 15 7).",
        )
        parser.add_argument(
            "--forcar",
            action="store_true",
            help="Força o disparo mesmo se já tiver sido notificado hoje.",
        )

    def handle(self, *args, **options):
        marcos_dias = options["dias"]
        forcar = options["forcar"]
        hoje = timezone.localdate()
        total_avaliados = 0
        total_alertas = 0

        self.stdout.write(f"Iniciando verificação de vigência de contratos em {hoje}...")
        self.stdout.write(f"Marcos de alerta configurados: {marcos_dias} dias antes do término.")

        contratos_ativos = Contrato.objects.filter(
            status=StatusContrato.ATIVO,
            data_termino__isnull=False,
        ).select_related("cliente")

        for contrato in contratos_ativos:
            total_avaliados += 1
            dias_restantes = (contrato.data_termino - hoje).days

            if dias_restantes in marcos_dias or (dias_restantes > 0 and dias_restantes <= min(marcos_dias) and forcar):
                # Verificar se já disparou este mesmo marco hoje
                if not forcar:
                    ja_notificado_hoje = ContratoAuditLog.objects.filter(
                        contrato=contrato,
                        tipo_evento=TipoEventoContratoAudit.ALTERACAO,
                        descricao__contains=f"{dias_restantes} dias",
                        criado_em__date=hoje,
                    ).exists()
                    if ja_notificado_hoje:
                        self.stdout.write(
                            f"Contrato {contrato.numero} já recebeu alerta de {dias_restantes} dias hoje. Ignorando."
                        )
                        continue

                self.stdout.write(
                    self.style.WARNING(
                        f"Contrato {contrato.numero} ({contrato.cliente.display_name if contrato.cliente else 'Cliente'}) "
                        f"está a {dias_restantes} dias do término ({contrato.data_termino}). Disparando alertas..."
                    )
                )

                try:
                    NotificacaoService.notificar_expiracao_proxima(contrato, dias_restantes)
                    total_alertas += 1
                except Exception as err:
                    self.stdout.write(
                        self.style.ERROR(f"Erro ao disparar alerta do contrato {contrato.numero}: {err}")
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Verificação concluída. Contratos avaliados: {total_avaliados}. Alertas emitidos: {total_alertas}."
            )
        )
