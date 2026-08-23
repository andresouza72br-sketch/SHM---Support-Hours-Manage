from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from shm.models import Ciclo, Cliente, Contrato, Pedido, Usuario
from shm.services.workflow_service import WorkflowService


class Command(BaseCommand):
    help = "Cria dados de demonstração para testar o SHM no frontend."

    def handle(self, *args, **options):
        self.stdout.write("Criando dados de demonstração...")

        # 1. Clientes
        cliente_acme, _ = Cliente.objects.get_or_create(
            cnpj="11.222.333/0001-44",
            defaults={
                "razao_social": "Acme Indústria e Comércio S.A.",
                "nome_fantasia": "Acme Corp",
                "email_contato": "contato@acme.com",
                "telefone": "(11) 3456-7890",
            },
        )

        cliente_globex, _ = Cliente.objects.get_or_create(
            cnpj="22.333.444/0001-55",
            defaults={
                "razao_social": "Globex Soluções Tecnológicas LTDA",
                "nome_fantasia": "Globex Tech",
                "email_contato": "suporte@globex.com",
                "telefone": "(21) 9876-5432",
            },
        )

        # 2. Usuários da Empresa Provedora
        admin, _ = Usuario.objects.get_or_create(
            email="admin@shm.com",
            defaults={
                "nome_completo": "Administrador Geral",
                "tipo_perfil": Usuario.TipoPerfil.ADMIN_EMPRESA,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin.set_password("admin123")
        admin.save()

        gestor_sup, _ = Usuario.objects.get_or_create(
            email="gestor.suporte@shm.com",
            defaults={
                "nome_completo": "Bernardo Gestor Suporte",
                "tipo_perfil": Usuario.TipoPerfil.GESTOR_SUPORTE,
                "is_staff": True,
            },
        )
        gestor_sup.set_password("senha123")
        gestor_sup.save()

        tecnico, _ = Usuario.objects.get_or_create(
            email="tecnico@shm.com",
            defaults={
                "nome_completo": "Rodrigo Técnico Dev",
                "tipo_perfil": Usuario.TipoPerfil.TECNICO,
            },
        )
        tecnico.set_password("senha123")
        tecnico.save()

        # 3. Usuários dos Clientes
        gestor_acme, _ = Usuario.objects.get_or_create(
            email="gestor@acme.com",
            defaults={
                "nome_completo": "Mariana Gestora Acme",
                "tipo_perfil": Usuario.TipoPerfil.GESTOR_CLIENTE,
                "cliente": cliente_acme,
            },
        )
        gestor_acme.set_password("senha123")
        gestor_acme.save()

        user_acme, _ = Usuario.objects.get_or_create(
            email="usuario@acme.com",
            defaults={
                "nome_completo": "Lucas Operador Acme",
                "tipo_perfil": Usuario.TipoPerfil.USUARIO_CLIENTE,
                "cliente": cliente_acme,
            },
        )
        user_acme.set_password("senha123")
        user_acme.save()

        # 4. Contratos
        hoje = timezone.localdate()
        inicio_ano = date(hoje.year, 1, 1)
        fim_ano = date(hoje.year, 12, 31)

        contrato_acme, _ = Contrato.objects.get_or_create(
            numero_contrato="CTR-ACME-2026",
            defaults={
                "cliente": cliente_acme,
                "data_inicio": inicio_ano,
                "data_fim": fim_ano,
                "horas_contratadas": Decimal("80.00"),
                "horas_herdadas": Decimal("15.00"),
                "status": Contrato.Status.ATIVO,
            },
        )

        contrato_globex, _ = Contrato.objects.get_or_create(
            numero_contrato="CTR-GLOBEX-2026",
            defaults={
                "cliente": cliente_globex,
                "data_inicio": inicio_ano,
                "data_fim": fim_ano,
                "horas_contratadas": Decimal("40.00"),
                "status": Contrato.Status.ATIVO,
            },
        )

        # 5. Pedidos e Ciclos para demonstração
        if not Pedido.objects.filter(cliente=cliente_acme).exists():
            # Pedido 1: Em Execução
            p1 = WorkflowService.criar_pedido(
                cliente=cliente_acme,
                contrato=contrato_acme,
                solicitante=gestor_acme,
                titulo="Correção no módulo financeiro e exportação para Excel",
                descricao_geral="Precisamos corrigir o cálculo de juros nas faturas e criar exportação em planilha.",
            )
            c1 = WorkflowService.decompor_pedido_em_ciclo(
                pedido=p1,
                usuario=gestor_sup,
                titulo_contexto="Correção do cálculo de juros",
                tipo_manutencao=Ciclo.TipoManutencao.CORRETIVA,
                descricao_escopo="Ajustar cálculo diário de mora no arquivo boleto.py",
                tarefas_data=[
                    {
                        "descricao": "Ajuste na fórmula matemática",
                        "horas_estimadas": "3.00",
                    },
                    {
                        "descricao": "Testes unitários e validação",
                        "horas_estimadas": "1.50",
                    },
                ],
            )
            WorkflowService.enviar_orcamento(c1, gestor_sup)
            WorkflowService.aprovar_orcamento(c1, gestor_acme)
            WorkflowService.iniciar_execucao_ciclo(c1, gestor_sup)

            # Técnico aponta horas na primeira tarefa
            t1 = c1.tarefas.first()
            WorkflowService.apontar_horas_tarefa(
                t1, tecnico, Decimal("2.50"), concluida=True
            )

            # Pedido 2: Aguardando Aprovação
            p2 = WorkflowService.criar_pedido(
                cliente=cliente_acme,
                contrato=contrato_acme,
                solicitante=user_acme,
                titulo="Treinamento da nova equipe no portal",
                descricao_geral="Solicitamos treinamento remoto de 2h para os novos operadores.",
            )
            c2 = WorkflowService.decompor_pedido_em_ciclo(
                pedido=p2,
                usuario=gestor_sup,
                titulo_contexto="Sessão de Consultoria e Treinamento",
                tipo_manutencao=Ciclo.TipoManutencao.CONSULTORIA_TREINAMENTO,
                descricao_escopo="Treinamento ao vivo com gravação e material de apoio",
                tarefas_data=[
                    {"descricao": "Preparação de roteiro", "horas_estimadas": "1.00"},
                    {"descricao": "Treinamento remoto", "horas_estimadas": "2.00"},
                ],
            )
            WorkflowService.enviar_orcamento(c2, gestor_sup)

        self.stdout.write(
            self.style.SUCCESS("[OK] Dados de demonstracao criados com sucesso!")
        )
        self.stdout.write("--------------------------------------------------")
        self.stdout.write("Usuários para teste:")
        self.stdout.write("1. Cliente Gestor: gestor@acme.com / senha123")
        self.stdout.write("2. Cliente Usuário: usuario@acme.com / senha123")
        self.stdout.write("3. Empresa Admin: admin@shm.com / admin123")
        self.stdout.write("4. Empresa Suporte: gestor.suporte@shm.com / senha123")
        self.stdout.write("5. Empresa Técnico: tecnico@shm.com / senha123")
        self.stdout.write("--------------------------------------------------")
