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
                "is_staff": False,
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

        cliente_mktdnb, _ = Cliente.objects.get_or_create(
            cnpj="11223344000199",
            defaults={
                "tipo": TipoCliente.PJ,
                "razao_social": "MKT-DNB Soluções Digitais Ltda",
                "nome_fantasia": "mkt-dnb",
                "email_contato": "contato@mkt-dnb.com",
                "telefone": "(11) 98888-7766",
                "pessoa_contato": "Marcelo Ribeiro",
                "cidade": "São Paulo",
                "estado": "SP",
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

        gerente_mktdnb, _ = User.objects.get_or_create(
            username="gerente.mktdnb",
            defaults={
                "email": "marcelo.gerente@mkt-dnb.com",
                "first_name": "Marcelo",
                "last_name": "Ribeiro (Gerente)",
                "role": UserRole.CLIENTE_GERENTE,
                "cliente": cliente_mktdnb,
            }
        )
        gerente_mktdnb.set_password("cliente123")
        gerente_mktdnb.save()

        analista_mktdnb, _ = User.objects.get_or_create(
            username="analista.mktdnb",
            defaults={
                "email": "fernanda.analista@mkt-dnb.com",
                "first_name": "Fernanda",
                "last_name": "Costa (Analista)",
                "role": UserRole.CLIENTE_ANALISTA,
                "cliente": cliente_mktdnb,
            }
        )
        analista_mktdnb.set_password("cliente123")
        analista_mktdnb.save()

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

        contrato_mktdnb, _ = Contrato.objects.get_or_create(
            numero="CT-2026-MKTDNB",
            defaults={
                "tipo": TipoContrato.NOVO,
                "cliente": cliente_mktdnb,
                "data_inicio": hoje - timedelta(days=5),
                "data_termino": hoje + timedelta(days=360),
                "horas_contratadas": Decimal("100.00"),
                "saldo": Decimal("100.00"),
                "horas_consumidas": Decimal("0.00"),
                "status": StatusContrato.ATIVO,
                "descricao_servicos": "Contrato de Manutenção e Suporte SHM — Empresa mkt-dnb (Pacote de 100 Horas)",
                "valor_mensal": Decimal("5000.00"),
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

        ciclo1 = Ciclo.objects.filter(pedido=pedido1, tipo=TipoCiclo.CORRETIVA).first()
        if not ciclo1:
            ciclo1 = Ciclo.objects.create(
                pedido=pedido1,
                tipo=TipoCiclo.CORRETIVA,
                contexto="Otimização de índices e refatoração de queries pesadas da DRE.",
                operador=tecnico_user,
                status=StatusCiclo.AGUARDANDO_ACEITE,
                horas_estimadas=Decimal("8.00"),
                horas_realizadas=Decimal("6.00"),
                apresentado_em=timezone.now() - timedelta(days=3),
                aprovado_em=timezone.now() - timedelta(days=2),
                aprovado_por=gerente_acme,
            )

        if not Tarefa.objects.filter(ciclo=ciclo1, descricao__startswith="Análise dos logs").exists():
            Tarefa.objects.create(
                ciclo=ciclo1,
                descricao="Análise dos logs de slow query e execução de EXPLAIN ANALYZE",
                horas_estimadas=Decimal("2.00"),
                horas_realizadas=Decimal("2.00"),
                status=StatusTarefa.REALIZADA,
                operador=tecnico_user,
            )
        if not Tarefa.objects.filter(ciclo=ciclo1, descricao__startswith="Criação de índices").exists():
            Tarefa.objects.create(
                ciclo=ciclo1,
                descricao="Criação de índices parciais e reescrita das views materializadas",
                horas_estimadas=Decimal("6.00"),
                horas_realizadas=Decimal("4.00"),
                status=StatusTarefa.REALIZADA,
                operador=tecnico_user,
            )

        ciclo2 = Ciclo.objects.filter(pedido=pedido1, tipo=TipoCiclo.TREINAMENTO).first()
        if not ciclo2:
            ciclo2 = Ciclo.objects.create(
                pedido=pedido1,
                tipo=TipoCiclo.TREINAMENTO,
                contexto="Capacitação ao vivo de 4h para a equipe contábil no módulo SPED.",
                operador=tecnico_user,
                status=StatusCiclo.AGUARDANDO_APROVACAO,
                horas_estimadas=Decimal("4.00"),
                apresentado_em=timezone.now() - timedelta(days=1),
            )

        if not Tarefa.objects.filter(ciclo=ciclo2, descricao__startswith="Preparação do ambiente").exists():
            Tarefa.objects.create(
                ciclo=ciclo2,
                descricao="Preparação do ambiente de testes e gravação do roteiro",
                horas_estimadas=Decimal("2.00"),
                status=StatusTarefa.PREVISTA,
                operador=tecnico_user,
            )
        if not Tarefa.objects.filter(ciclo=ciclo2, descricao__startswith="Sessão ao vivo").exists():
            Tarefa.objects.create(
                ciclo=ciclo2,
                descricao="Sessão ao vivo com gravação e plantão de dúvidas",
                horas_estimadas=Decimal("2.00"),
                status=StatusTarefa.PREVISTA,
                operador=tecnico_user,
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

        # Pedido 3 - MKT-DNB (Novo Contrato 100h)
        pedido_mkt, _ = Pedido.objects.get_or_create(
            protocolo="OS2026080003",
            defaults={
                "cliente": cliente_mktdnb,
                "contrato": contrato_mktdnb,
                "assunto": "Configuração de Webhooks de Leads e Integração CRM",
                "descricao": "Precisamos integrar os formulários da landing page via webhook seguro com fila de processamento assíncrono.",
                "prioridade": PrioridadePedido.ALTA,
                "status": StatusPedido.AGUARDANDO_APROVACAO,
                "criado_por": gerente_mktdnb,
            }
        )

        ciclo_mkt = Ciclo.objects.filter(pedido=pedido_mkt, tipo=TipoCiclo.CORRETIVA).first()
        if not ciclo_mkt:
            ciclo_mkt = Ciclo.objects.create(
                pedido=pedido_mkt,
                tipo=TipoCiclo.CORRETIVA,
                contexto="Refatoração do receptor de webhooks com autenticação HMAC e retries automáticos.",
                operador=tecnico_user,
                status=StatusCiclo.AGUARDANDO_APROVACAO,
                horas_estimadas=Decimal("6.00"),
                apresentado_em=timezone.now() - timedelta(hours=2),
            )

        if not Tarefa.objects.filter(ciclo=ciclo_mkt, descricao__startswith="Desenho da arquitetura").exists():
            Tarefa.objects.create(
                ciclo=ciclo_mkt,
                descricao="Desenho da arquitetura de mensageria e validação dos endpoints",
                horas_estimadas=Decimal("2.00"),
                status=StatusTarefa.PREVISTA,
                operador=tecnico_user,
            )
        if not Tarefa.objects.filter(ciclo=ciclo_mkt, descricao__startswith="Implementação do middleware").exists():
            Tarefa.objects.create(
                ciclo=ciclo_mkt,
                descricao="Implementação do middleware de assinatura e logs estruturados",
                horas_estimadas=Decimal("4.00"),
                status=StatusTarefa.PREVISTA,
                operador=tecnico_user,
            )

        # 6. Comentários
        if not Comentario.objects.filter(ciclo=ciclo1, autor=tecnico_user).exists():
            Comentario.objects.create(
                ciclo=ciclo1,
                autor=tecnico_user,
                texto="Identificamos que a tabela de itens da nota estava sem índice na coluna data_emissao. A query baixou de 14s para 180ms.",
            )
        if not Comentario.objects.filter(ciclo=ciclo1, autor=gerente_acme).exists():
            Comentario.objects.create(
                ciclo=ciclo1,
                autor=gerente_acme,
                texto="Excelente! Testamos aqui e o relatório abriu instantaneamente.",
            )
        if not Comentario.objects.filter(ciclo=ciclo_mkt, autor=gerente_mktdnb).exists():
            Comentario.objects.create(
                ciclo=ciclo_mkt,
                autor=gerente_mktdnb,
                texto="Olá equipe, precisamos garantir que o webhook suporte até 500 requisições simultâneas durante a campanha.",
            )
        if not Comentario.objects.filter(ciclo=ciclo_mkt, autor=admin_user).exists():
            Comentario.objects.create(
                ciclo=ciclo_mkt,
                autor=admin_user,
                texto="Perfeito Marcelo! O escopo de 6.0h já contempla processamento assíncrono e testes de carga.",
            )

        # 7. Notificações
        if not Notification.objects.filter(usuario=gerente_acme, titulo__startswith="Aceite Solicitado").exists():
            Notification.objects.create(
                usuario=gerente_acme,
                titulo="Aceite Solicitado: Ciclo Corretiva #OS2026080001",
                mensagem="O técnico Marcos finalizou a execução (6.00h realizadas) e solicitou seu aceite formal.",
                url=f"/pedidos/{pedido1.id}",
                lida=False,
            )
        if not Notification.objects.filter(usuario=gerente_mktdnb, titulo__startswith="Orçamento Emitido").exists():
            Notification.objects.create(
                usuario=gerente_mktdnb,
                titulo="Orçamento Emitido: Ciclo #OS2026080003 (6.0h)",
                mensagem="A equipe SHM apresentou o orçamento técnico de 6.0h para aprovação.",
                url=f"/pedidos/{pedido_mkt.id}",
                lida=False,
            )

        self.stdout.write(self.style.SUCCESS("Seed de dados concluído com sucesso!"))
        self.stdout.write("Usuários criados:")
        self.stdout.write("  Admin:            admin / admin123 (Empresa)")
        self.stdout.write("  Técnico:          tecnico / tecnico123 (Empresa)")
        self.stdout.write("  Gerente ACME:     gerente.acme / cliente123 (Cliente ACME)")
        self.stdout.write("  Analista ACME:    analista.acme / cliente123 (Cliente ACME)")
        self.stdout.write("  Gerente MKT-DNB:  gerente.mktdnb / cliente123 (Cliente mkt-dnb)")
        self.stdout.write("  Analista MKT-DNB: analista.mktdnb / cliente123 (Cliente mkt-dnb)")