import sys
from django.core.management.base import BaseCommand, CommandError

from apps.contratos.forensic_service import ForensicAuditService
from apps.contratos.models import ForensicAuditLog


class Command(BaseCommand):
    help = "Executa a verificação matemática pericial da integridade dos registros encadeados (Hash Chaining)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--particao",
            type=str,
            help="Nome específico da partição pericial (ex: contrato:1 ou global).",
        )
        parser.add_argument(
            "--contrato-id",
            type=int,
            help="ID do contrato para verificação isolada da partição correspondente.",
        )

    def handle(self, *args, **options):
        particao_arg = options.get("particao")
        contrato_id = options.get("contrato_id")

        if contrato_id:
            particoes = [f"contrato:{contrato_id}"]
        elif particao_arg:
            particoes = [particao_arg]
        else:
            # Seleciona todas as partições ativas existentes na trilha pericial
            particoes = list(
                ForensicAuditLog.objects.values_list("particao", flat=True)
                .distinct()
                .order_by("particao")
            )
            if not particoes:
                self.stdout.write(self.style.WARNING("Nenhuma partição encontrada na trilha de auditoria."))
                return

        self.stdout.write(f"Iniciando auditoria pericial em {len(particoes)} partição(ões)...")

        total_verificadas = 0
        total_rompidas = 0

        for p in particoes:
            resultado = ForensicAuditService.verificar_integridade_particao(p)
            status = resultado["status"]
            total_verificadas += 1

            if status == "integro":
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [OK] Partição '{p}': {resultado['total_registros_verificados']} registro(s) verificados "
                        f"em {resultado['tempo_verificacao_ms']}ms. Último hash: {str(resultado['ultimo_hash'])[:16]}..."
                    )
                )
            else:
                total_rompidas += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"  [ALERTA DE FRAUDE] Partição '{p}' ROMPIDA!\n"
                        f"    Sequência da quebra: #{resultado.get('registro_falha_sequencia')}\n"
                        f"    ID do registro: {resultado.get('registro_falha_id')}\n"
                        f"    Hash calculado:  {resultado.get('hash_calculado')}\n"
                        f"    Hash armazenado: {resultado.get('hash_armazenado')}\n"
                        f"    Mensagem: {resultado.get('mensagem')}"
                    )
                )

        self.stdout.write("---")
        if total_rompidas == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Conclusão: 100% de integridade confirmada. Todas as {total_verificadas} partições são matematicamente válidas."
                )
            )
        else:
            raise CommandError(
                f"FALHA PERICIAL: {total_rompidas} partição(ões) corrompida(s) de um total de {total_verificadas} avaliada(s)."
            )
