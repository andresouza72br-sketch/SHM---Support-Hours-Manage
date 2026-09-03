from decimal import Decimal
from datetime import date, timedelta
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente, StatusCliente
from apps.contratos.models import (
    Contrato,
    StatusContrato,
    TipoContrato,
    AceiteLink,
    ContratoDocumento,
    ContratoAuditLog,
    TipoEventoContratoAudit,
    TipoDocumentoContrato,
)
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
                "email": "admin@shm.local",
                "first_name": "Carlos",
                "last_name": "Diretor",
                "role": UserRole.EMPRESA_ADMIN,
                "is_staff": True,
                "is_superuser": True,
            }
        )
        admin_user.email = "admin@shm.local"
        admin_user.avatar_url = "https://api.dicebear.com/7.x/avataaars/svg?seed=admin@shm.local"
        admin_user.set_password("admin123")
        admin_user.save()

        tecnico_user, _ = User.objects.get_or_create(
            username="tecnico",
            defaults={
                "email": "tecnico@shm.local",
                "first_name": "Marcos",
                "last_name": "Técnico Especialista",
                "role": UserRole.EMPRESA_TECNICO,
                "is_staff": False,
            }
        )
        tecnico_user.email = "tecnico@shm.local"
        tecnico_user.avatar_url = "https://api.dicebear.com/7.x/avataaars/svg?seed=tecnico@shm.local"
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
            username="cligerente",
            defaults={
                "email": "gerente@acme.com",
                "first_name": "AcmeGer",
                "last_name": "Germano",
                "role": UserRole.CLIENTE_GERENTE,
                "cliente": cliente_acme,
            }
        )
        gerente_acme.email = "gerente@acme.com"
        gerente_acme.set_password("cliente123")
        gerente_acme.is_active = True
        gerente_acme.save()

        analista_acme, _ = User.objects.get_or_create(
            username="clianalista",
            defaults={
                "email": "analista@acme.com",
                "first_name": "AcmeAna",
                "last_name": "Ana Paula",
                "role": UserRole.CLIENTE_ANALISTA,
                "cliente": cliente_acme,
            }
        )
        analista_acme.email = "analista@acme.com"
        analista_acme.set_password("cliente123")
        analista_acme.is_active = True
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
        gerente_mktdnb.email = "marcelo.gerente@mkt-dnb.com"
        gerente_mktdnb.avatar_url = "https://api.dicebear.com/7.x/avataaars/svg?seed=marcelo.gerente@mkt-dnb.com"
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
                "dia_faturamento": 10,
                "gestor_nome": "Roberto Silva",
                "gestor_email": "roberto@acme.com",
                "gestor_telefone": "(11) 98765-4321",
                "emails_notificacao": [
                    {"email": "roberto@acme.com", "nome": "Roberto Silva (Gerente)", "ativo": True},
                    {"email": "ana@acme.com", "nome": "Ana Paula (Analista)", "ativo": True},
                    {"email": "financeiro@acme.com", "nome": "Financeiro Acme", "ativo": True},
                ],
                "criado_por": admin_user,
            }
        )

        # Seed sample documents for contrato_acme
        if not contrato_acme.documentos.exists():
            doc1 = ContratoDocumento.objects.create(
                contrato=contrato_acme,
                nome_original="Proposta_Comercial_SHM_Acme_2026.pdf",
                tipo_documento=TipoDocumentoContrato.PROPOSTA,
                tamanho_bytes=245800,
                enviado_por=admin_user,
            )
            doc1.arquivo.save("Proposta_Comercial_SHM_Acme_2026.pdf", ContentFile(b"%PDF-1.4 Mock PDF Proposta Comercial"), save=True)

            doc2 = ContratoDocumento.objects.create(
                contrato=contrato_acme,
                nome_original="Contrato_Prestacao_Servicos_Assinado_CT20260001.pdf",
                tipo_documento=TipoDocumentoContrato.CONTRATO_ASSINADO,
                tamanho_bytes=512000,
                enviado_por=admin_user,
            )
            doc2.arquivo.save("Contrato_Prestacao_Servicos_Assinado_CT20260001.pdf", ContentFile(b"%PDF-1.4 Mock PDF Contrato Assinado"), save=True)

            ContratoAuditLog.objects.create(
                contrato=contrato_acme,
                tipo_evento=TipoEventoContratoAudit.CRIACAO,
                descricao=f"Contrato {contrato_acme.numero} cadastrado por Carlos Diretor com franquia de 100.0h.",
                usuario=admin_user,
            )
            ContratoAuditLog.objects.create(
                contrato=contrato_acme,
                tipo_evento=TipoEventoContratoAudit.UPLOAD_DOCUMENTO,
                descricao="Upload do documento 'Proposta_Comercial_SHM_Acme_2026.pdf' (Proposta Comercial).",
                documento_nome="Proposta_Comercial_SHM_Acme_2026.pdf",
                usuario=admin_user,
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
                "dia_faturamento": 5,
                "gestor_nome": "Mariana Souza",
                "gestor_email": "suporte@techsolutions.com",
                "gestor_telefone": "(21) 99887-6655",
                "emails_notificacao": [
                    {"email": "suporte@techsolutions.com", "nome": "Mariana Souza", "ativo": True},
                    {"email": "contato@techsolutions.com", "nome": "Diretoria Tech", "ativo": False},
                ],
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
                "dia_faturamento": 15,
                "gestor_nome": "Marcelo Ribeiro",
                "gestor_email": "marcelo.gerente@mkt-dnb.com",
                "gestor_telefone": "(11) 98888-7766",
                "emails_notificacao": [
                    {"email": "marcelo.gerente@mkt-dnb.com", "nome": "Marcelo Ribeiro (Gerente)", "ativo": True},
                    {"email": "fernanda.analista@mkt-dnb.com", "nome": "Fernanda Costa", "ativo": True},
                ],
                "criado_por": admin_user,
            }
        )

        if not contrato_mktdnb.documentos.exists():
            doc_mkt = ContratoDocumento.objects.create(
                contrato=contrato_mktdnb,
                nome_original="Proposta_Tecnica_MKTDNB_100h.pdf",
                tipo_documento=TipoDocumentoContrato.PROPOSTA,
                tamanho_bytes=320000,
                enviado_por=admin_user,
            )
            doc_mkt.arquivo.save("Proposta_Tecnica_MKTDNB_100h.pdf", ContentFile(b"%PDF-1.4 Mock PDF Proposta MKT DNB"), save=True)

        contrato_acme2, _ = Contrato.objects.get_or_create(
            numero="CT-2026-0004",
            defaults={
                "tipo": TipoContrato.NOVO,
                "cliente": cliente_acme,
                "data_inicio": hoje - timedelta(days=45),
                "data_termino": hoje + timedelta(days=320),
                "horas_contratadas": Decimal("80.00"),
                "saldo": Decimal("64.00"),
                "horas_consumidas": Decimal("16.00"),
                "status": StatusContrato.ATIVO,
                "descricao_servicos": "Consultoria Contábil & Automação Fiscal",
                "valor_mensal": Decimal("3800.00"),
                "criado_por": admin_user,
            }
        )

        contrato_acme_concluido, _ = Contrato.objects.get_or_create(
            numero="CT-2025-0099",
            defaults={
                "tipo": TipoContrato.NOVO,
                "cliente": cliente_acme,
                "data_inicio": hoje - timedelta(days=395),
                "data_termino": hoje - timedelta(days=30),
                "horas_contratadas": Decimal("100.00"),
                "saldo": Decimal("25.00"),
                "horas_consumidas": Decimal("75.00"),
                "status": StatusContrato.CONCLUIDO,
                "descricao_servicos": "Suporte e Manutenção Legada 2025 (Concluído)",
                "gestor_nome": "Roberto Silva",
                "gestor_email": "gerente@acme.com",
                "gestor_telefone": "(11) 98765-4321",
                "criado_por": admin_user,
            }
        )
        contrato_acme_concluido.status = StatusContrato.CONCLUIDO
        contrato_acme_concluido.saldo = Decimal("25.00")
        contrato_acme_concluido.horas_consumidas = Decimal("75.00")
        contrato_acme_concluido.save()

        contrato_tech2, _ = Contrato.objects.get_or_create(
            numero="CT-2026-0005",
            defaults={
                "tipo": TipoContrato.NOVO,
                "cliente": cliente_tech,
                "data_inicio": hoje - timedelta(days=20),
                "data_termino": hoje + timedelta(days=345),
                "horas_contratadas": Decimal("120.00"),
                "saldo": Decimal("105.50"),
                "horas_consumidas": Decimal("14.50"),
                "status": StatusContrato.ATIVO,
                "descricao_servicos": "Suporte Avançado Cloud & DevOps",
                "valor_mensal": Decimal("6200.00"),
                "criado_por": admin_user,
            }
        )

        contrato_mkt2, _ = Contrato.objects.get_or_create(
            numero="CT-2026-0006",
            defaults={
                "tipo": TipoContrato.NOVO,
                "cliente": cliente_mktdnb,
                "data_inicio": hoje - timedelta(days=10),
                "data_termino": hoje + timedelta(days=355),
                "horas_contratadas": Decimal("60.00"),
                "saldo": Decimal("42.00"),
                "horas_consumidas": Decimal("18.00"),
                "status": StatusContrato.ATIVO,
                "descricao_servicos": "Automação de Marketing e Integrações Webhooks",
                "valor_mensal": Decimal("3200.00"),
                "criado_por": admin_user,
            }
        )

        contrato_acme3, _ = Contrato.objects.get_or_create(
            numero="CT-2026-0007",
            defaults={
                "tipo": TipoContrato.NOVO,
                "cliente": cliente_acme,
                "data_inicio": hoje - timedelta(days=50),
                "data_termino": hoje + timedelta(days=315),
                "horas_contratadas": Decimal("150.00"),
                "saldo": Decimal("130.00"),
                "horas_consumidas": Decimal("20.00"),
                "status": StatusContrato.ATIVO,
                "descricao_servicos": "Desenvolvimento e Sustentação de Módulos ERP",
                "valor_mensal": Decimal("7500.00"),
                "criado_por": admin_user,
            }
        )

        contrato_acme_exp, _ = Contrato.objects.get_or_create(
            numero="CT-2025-0099",
            defaults={
                "tipo": TipoContrato.NOVO,
                "cliente": cliente_acme,
                "data_inicio": hoje - timedelta(days=400),
                "data_termino": hoje - timedelta(days=35),
                "horas_contratadas": Decimal("100.00"),
                "saldo": Decimal("25.00"),
                "horas_consumidas": Decimal("75.00"),
                "status": StatusContrato.CONCLUIDO,
                "descricao_servicos": "Contrato Anual Anterior de Suporte ERP 2025 (Encerrado)",
                "valor_mensal": Decimal("4000.00"),
                "dia_faturamento": 10,
                "criado_por": admin_user,
            }
        )

        contrato_tech3, _ = Contrato.objects.get_or_create(
            numero="CT-2026-0008",
            defaults={
                "tipo": TipoContrato.NOVO,
                "cliente": cliente_tech,
                "data_inicio": hoje - timedelta(days=5),
                "data_termino": hoje + timedelta(days=360),
                "horas_contratadas": Decimal("40.00"),
                "saldo": Decimal("8.00"),
                "horas_consumidas": Decimal("32.00"),
                "status": StatusContrato.ATIVO,
                "descricao_servicos": "Auditoria de Segurança e Otimização de Performance",
                "valor_mensal": Decimal("2800.00"),
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

        # 8. Configurações de Notificações
        from apps.notificacoes.config_service import NotificacaoConfigService
        NotificacaoConfigService.garantir_configuracoes_padrao()

        self.stdout.write(self.style.SUCCESS("Seed de dados concluído com sucesso!"))
        self.stdout.write("Usuários criados:")
        self.stdout.write("  Admin:            admin / admin123 (Empresa)")
        self.stdout.write("  Técnico:          tecnico / tecnico123 (Empresa)")
        self.stdout.write("  Gerente ACME:     gerente.acme / cliente123 (Cliente ACME)")
        self.stdout.write("  Analista ACME:    analista.acme / cliente123 (Cliente ACME)")
        self.stdout.write("  Gerente MKT-DNB:  gerente.mktdnb / cliente123 (Cliente mkt-dnb)")
        self.stdout.write("  Analista MKT-DNB: analista.mktdnb / cliente123 (Cliente mkt-dnb)")