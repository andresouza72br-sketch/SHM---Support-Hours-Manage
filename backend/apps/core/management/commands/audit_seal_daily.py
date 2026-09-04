from datetime import date, datetime
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.contratos.forensic_service import ForensicAuditService
from apps.contratos.models import ForensicAuditLog


class Command(BaseCommand):
    help = "Executa o fechamento pericial diário (Daily Seal) consolidando os hashes de cada partição ativa (RN-16)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--data",
            type=str,
            help="Data de referência para o selo no formato AAAA-MM-DD (padrão: data atual).",
        )
        parser.add_argument(
            "--particao",
            type=str,
            help="Partição específica para lavratura do selo (padrão: todas as partições com registros).",
        )

    def handle(self, *args, **options):
        data_str = options.get("data")
        particao_arg = options.get("particao")

        if data_str:
            try:
                data_ref = datetime.strptime(data_str, "%Y-%m-%d").date()
            except ValueError:
                raise CommandError(f"Formato de data inválido: '{data_str}'. Utilize o padrão AAAA-MM-DD.")
        else:
            data_ref = timezone.localdate()

        if particao_arg:
            particoes = [particao_arg]
        else:
            particoes = list(
                ForensicAuditLog.objects.filter(timestamp__date__lte=data_ref)
                .values_list("particao", flat=True)
                .distinct()
                .order_by("particao")
            )
            if not particoes:
                self.stdout.write(
                    self.style.WARNING(f"Nenhum registro pericial encontrado até a data {data_ref.isoformat()}.")
                )
                return

        self.stdout.write(f"Iniciando fechamento diário pericial em {len(particoes)} partição(ões) para {data_ref.isoformat()}...")

        selos_gerados = 0
        for p in particoes:
            selo = ForensicAuditService.selar_particao_diaria(p, data_referencia=data_ref)
            if selo:
                selos_gerados += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [SELO LAVRADO] Partição '{p}' | Seq: #{selo.ultima_sequencia} | "
                        f"Eventos hoje: {selo.total_eventos_dia} | Digest: {selo.selo_digest[:16]}..."
                    )
                )

        self.stdout.write("---")
        self.stdout.write(
            self.style.SUCCESS(
                f"Fechamento pericial concluído: {selos_gerados} selo(s) diário(s) lavrado(s) com sucesso."
            )
        )
