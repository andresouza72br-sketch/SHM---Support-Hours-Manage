from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente, StatusCliente
from apps.contratos.models import Contrato, StatusContrato, TipoContrato, AceiteLink
from apps.pedidos.models import Pedido, StatusPedido, PrioridadePedido
from apps.ciclos.models import Ciclo, TipoCiclo, StatusCiclo
from apps.tarefas.models import Tarefa, StatusTarefa
from apps.saldo.models import HistoricoSaldo, TipoOperacaoSaldo
from apps.comunicacao.models import Comentario
from apps.notificacoes.models import Notification, TimelineEvent, TipoEventoTimeline

class Command(BaseCommand):
    help = "Popula o banco de dados com dados realistas de demonstração do SHM."

    def handle(self, *args, **options):
        self.stdout.write("Iniciando seed de dados...")

        # 1. Usuários da Empresa
        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@empresa.com",
                "first_name": "Carlos",
                "last_name": "Diretor",
                "role": UserRole.EMPRESA_ADMIN,
                "is_staff": True,
                "is_superuser": True,
            }
        )
        admin_user.set_password("admin123")
        admin_user.save()

        tecnico_user, _ = User.objects.get_or_create(
            username="tecnico",
            defaults={
                "email": "marcos.tecnico@empresa.com",
                "first_name": "Marcos",
                "last_name": "Técnico Especialista",
                "role": UserRole.EMPRESA_TECNICO,
                "is_staff": True,
            }
        )
        tecnico_user.set_password("tecnico123")
        tecnico_user.save()

        # 2. Clientes
        cliente_acme, _ = Cliente.objects.get_or_create(
            cnpj="12345678000195",
            defaults={
                "tipo": TipoCliente.PJ,
                "razao_social": "Acme Indústria e Comércio S/A",
                "nome_fantasia": "Acme Corp",
                "email_contato": "contato@acme.com",
                "telefone": "(11) 98765-4321",
                "pessoa_contato": "Roberto Silva",
                "cidade": "São Paulo",
                "estado": "SP",
                "status": StatusCliente.ATIVO,
            }
        )

        cliente_tech, _ = Cliente.objects.get_or_create(
            cnpj="98765432000188",
            defaults={
                "tipo": TipoCliente.PJ,
                "razao_social": "Tech Solutions Brasil Ltda",
                "nome_fantasia": "Tech Solutions",
                "email_contato": "suporte@techsolutions.com",
                "telefone": "(21) 99887-6655",
                "pessoa_contato": "Mariana Souza",
                "cidade": "Rio de Janeiro",
                "estado": "RJ",
                "status": StatusCliente.ATIVO,
            }
        )

        # 3. Usuários Clientes
        gerente_acme, _ = User.objects.get_or_create(
            username="gerente.acme",
            defaults={
                "email": "roberto@acme.com",
                "first_name": "Roberto",
                "last_name": "Silva (Gerente)",
                "role": UserRole.CLIENTE_GERENTE,
                "cliente": cliente_acme,
            }
        )
        gerente_acme.set_password("cliente123")
        gerente_acme.save()

        analista_acme, _ = User.objects.get_or_create(
            username="analista.acme",
            defaults={
                "email": "ana@acme.com",
                "first_name": "Ana",
                "last_name": "Paula (Analista)",
                "role": UserRole.CLIENTE_ANALISTA,
                "cliente": cliente_acme,
            }
        )
        analista_acme.set_password("cliente123")
        analista_acme.save()

        # 4. Contratos
        hoje = timezone.localdate()
        contrato_acme, _ = Contrato.objects.get_or_create(
            numero="CT-2026-0001",
            defaults={
                "tipo": TipoContrato.NOVO,
                "cliente": cliente_acme,
                "data_inicio": hoje - timedelta(days=60),
                "data_termino": hoje + timedelta(days=305),
                "horas_contratadas": Decimal("100.00"),
                "saldo": Decimal("86.00"),
                "horas_consumidas": Decimal("14.00"),
                "status": StatusContrato.ATIVO,
                "descricao_servicos": "Suporte N2/N3 especializado em ERP e Banco de Dados.",
                "valor_mensal": Decimal("4500.00"),
                "criado_por": admin_user,
            }
        )

        contrato_tech, _ = Contrato.objects.get_or_create(
            numero="CT-2026-0002",
            defaults={
                "tipo": TipoContrato.NOVO,
                "cliente": cliente_tech,
                "data_inicio": hoje - timedelta(days=30),
                "data_termino": hoje + timedelta(days=335),
                "horas_contratadas": Decimal("50.00"),
                "saldo": Decimal("50.00"),
                "status": StatusContrato.ATIVO,
                "descricao_servicos": "Suporte mensal sob demanda.",
                "valor_mensal": Decimal("2500.00"),
                "criado_por": admin_user,
            }
        )

        # 5. Pedidos & Ciclos
        pedido1, _ = Pedido.objects.get_or_create(
            protocolo="OS2026080001",
            defaults={
                "cliente": cliente_acme,
                "contrato": contrato_acme,
                "assunto": "Lentidão nas consultas de relatórios e treinamento equipe fiscal",
                "descricao": "Sistema apresentando timeout ao gerar DRE no final do mês. Também precisamos de treinamento sobre o novo módulo SPED.",
                "prioridade": PrioridadePedido.ALTA,
                "status": StatusPedido.AGUARDANDO_ACEITE,
                "criado_por": gerente_acme,
            }
        )

        ciclo1, _ = Ciclo.objects.get_or_create(
            pedido=pedido1,
            tipo=TipoCiclo.CORRETIVA,
            defaults={
                "contexto": "Otimização de índices e refatoração de queries pesadas da DRE.",
                "operador": tecnico_user,
                "status": StatusCiclo.AGUARDANDO_ACEITE,
                "horas_estimadas": Decimal("8.00"),
                "horas_realizadas": Decimal("6.00"),
                "apresentado_em": timezone.now() - timedelta(days=3),
                "aprovado_em": timezone.now() - timedelta(days=2),
                "aprovado_por": gerente_acme,
            }
        )

        Tarefa.objects.get_or_create(
            ciclo=ciclo1,
            descricao="Análise dos logs de slow query e execução de EXPLAIN ANALYZE",
            defaults={
                "horas_estimadas": Decimal("2.00"),
                "horas_realizadas": Decimal("2.00"),
                "status": StatusTarefa.REALIZADA,
                "operador": tecnico_user,
            }
        )
        Tarefa.objects.get_or_create(
            ciclo=ciclo1,
            descricao="Criação de índices parciais e reescrita das views materializadas",
            defaults={
                "horas_estimadas": Decimal("6.00"),
                "horas_realizadas": Decimal("4.00"),
                "status": StatusTarefa.REALIZADA,
                "operador": tecnico_user,
            }
        )

        ciclo2, _ = Ciclo.objects.get_or_create(
            pedido=pedido1,
            tipo=TipoCiclo.TREINAMENTO,
            defaults={
                "contexto": "Capacitação ao vivo de 4h para a equipe contábil no módulo SPED.",
                "operador": tecnico_user,
                "status": StatusCiclo.AGUARDANDO_APROVACAO,
                "horas_estimadas": Decimal("4.00"),
                "apresentado_em": timezone.now() - timedelta(days=1),
            }
        )

        Tarefa.objects.get_or_create(
            ciclo=ciclo2,
            descricao="Preparação do ambiente de testes e gravação do roteiro",
            defaults={
                "horas_estimadas": Decimal("2.00"),
                "status": StatusTarefa.PREVISTA,
                "operador": tecnico_user,
            }
        )
        Tarefa.objects.get_or_create(
            ciclo=ciclo2,
            descricao="Sessão ao vivo com gravação e plantão de dúvidas",
            defaults={
                "horas_estimadas": Decimal("2.00"),
                "status": StatusTarefa.PREVISTA,
                "operador": tecnico_user,
            }
        )

        # Pedido 2
        pedido2, _ = Pedido.objects.get_or_create(
            protocolo="OS2026080002",
            defaults={
                "cliente": cliente_acme,
                "contrato": contrato_acme,
                "assunto": "Integração com Gateway de Pagamento Pix",
                "descricao": "Queremos automatizar a baixa dos boletos via webhook Pix.",
                "prioridade": PrioridadePedido.MEDIA,
                "status": StatusPedido.ABERTO,
                "criado_por": analista_acme,
            }
        )

        # 6. Comentários
        Comentario.objects.get_or_create(
            ciclo=ciclo1,
            autor=tecnico_user,
            texto="Identificamos que a tabela de itens da nota estava sem índice na coluna data_emissao. A query baixou de 14s para 180ms.",
        )
        Comentario.objects.get_or_create(
            ciclo=ciclo1,
            autor=gerente_acme,
            texto="Excelente! Testamos aqui e o relatório abriu instantaneamente.",
        )

        # 7. Notificações
        Notification.objects.get_or_create(
            usuario=gerente_acme,
            titulo="Aceite Solicitado: Ciclo Corretiva #OS2026080001",
            defaults={
                "mensagem": "O técnico Marcos finalizou a execução (6.00h realizadas) e solicitou seu aceite formal.",
                "url": f"/pedidos/{pedido1.id}",
                "lida": False,
            }
        )

        self.stdout.write(self.style.SUCCESS("Seed de dados concluído com sucesso!"))
        self.stdout.write("Usuários criados:")
        self.stdout.write("  Admin:    admin / admin123 (Empresa)")
        self.stdout.write("  Técnico:  tecnico / tecnico123 (Empresa)")
        self.stdout.write("  Cliente:  gerente.acme / cliente123 (Cliente)")
        self.stdout.write("  Analista: analista.acme / cliente123 (Cliente)")