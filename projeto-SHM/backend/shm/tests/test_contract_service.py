from datetime import date
from decimal import Decimal

import pytest
from django.core.exceptions import PermissionDenied

from shm.models.clients import Cliente
from shm.models.contracts import Contrato
from shm.models.requests import Ciclo
from shm.models.users import Usuario
from shm.services.contract_service import ContractService
from shm.services.workflow_service import WorkflowService


@pytest.mark.django_db
class TestContractService:
    @pytest.fixture
    def setup_data(self):
        cliente = Cliente.objects.create(
            razao_social="Empresa Teste LTDA",
            nome_fantasia="Empresa Teste",
            cnpj="12.345.678/0001-90",
            email_contato="contato@empresa.com",
        )
        gestor_cliente = Usuario.objects.create_user(
            email="gestor@empresa.com",
            nome_completo="Gestor Cliente Teste",
            tipo_perfil=Usuario.TipoPerfil.GESTOR_CLIENTE,
            cliente=cliente,
        )
        usuario_cliente = Usuario.objects.create_user(
            email="user@empresa.com",
            nome_completo="User Comum Teste",
            tipo_perfil=Usuario.TipoPerfil.USUARIO_CLIENTE,
            cliente=cliente,
        )
        admin_empresa = Usuario.objects.create_user(
            email="admin@provedor.com",
            nome_completo="Admin Provedor",
            tipo_perfil=Usuario.TipoPerfil.ADMIN_EMPRESA,
        )
        tecnico = Usuario.objects.create_user(
            email="tecnico@provedor.com",
            nome_completo="Técnico Provedor",
            tipo_perfil=Usuario.TipoPerfil.TECNICO,
        )
        contrato = Contrato.objects.create(
            numero_contrato="CTR-2026-001",
            cliente=cliente,
            data_inicio=date(2026, 1, 1),
            data_fim=date(2026, 12, 31),
            horas_contratadas=Decimal("50.00"),
            status=Contrato.Status.ATIVO,
        )
        return {
            "cliente": cliente,
            "gestor_cliente": gestor_cliente,
            "usuario_cliente": usuario_cliente,
            "admin_empresa": admin_empresa,
            "tecnico": tecnico,
            "contrato": contrato,
        }

    def test_deducao_horas_realizadas_sucesso(self, setup_data):
        """Valida se as horas realizadas são deduzidas e o saldo é recalculado corretamente."""
        data = setup_data
        contrato = data["contrato"]
        gestor = data["gestor_cliente"]

        pedido = WorkflowService.criar_pedido(
            cliente=data["cliente"],
            contrato=contrato,
            solicitante=gestor,
            titulo="Ajuste de Relatório",
            descricao_geral="Ajustar colunas",
        )

        ciclo = WorkflowService.decompor_pedido_em_ciclo(
            pedido=pedido,
            usuario=data["admin_empresa"],
            titulo_contexto="Correção de bug",
            tipo_manutencao=Ciclo.TipoManutencao.CORRETIVA,
            descricao_escopo="Correção SQL",
            tarefas_data=[
                {"descricao": "Ajustar query", "horas_estimadas": "4.00"},
                {"descricao": "Validar dados", "horas_estimadas": "2.00"},
            ],
        )

        WorkflowService.enviar_orcamento(ciclo, data["admin_empresa"])
        WorkflowService.aprovar_orcamento(ciclo, gestor)
        WorkflowService.iniciar_execucao_ciclo(ciclo, data["admin_empresa"])

        # Técnico realiza horas diferentes das estimadas (3.00 e 1.50 = 4.50h total)
        tarefas = list(ciclo.tarefas.all())
        WorkflowService.apontar_horas_tarefa(
            tarefas[0], data["tecnico"], Decimal("3.00"), concluida=True
        )
        WorkflowService.apontar_horas_tarefa(
            tarefas[1], data["tecnico"], Decimal("1.50"), concluida=True
        )

        WorkflowService.solicitar_aceite_ciclo(ciclo, data["admin_empresa"])

        # Gestor do cliente dá o aceite final
        contrato_atualizado = ContractService.deduzir_horas_ciclo(ciclo, gestor)

        assert contrato_atualizado.horas_consumidas == Decimal("4.50")
        assert contrato_atualizado.saldo_horas == Decimal("45.50")
        assert ciclo.status == Ciclo.Status.ACEITO
        assert ciclo.aceite_por == gestor

    def test_deducao_gera_saldo_negativo_sem_bloquear(self, setup_data):
        """Valida que o sistema permite saldo negativo quando as horas realizadas excedem o saldo."""
        data = setup_data
        contrato = data["contrato"]
        contrato.horas_contratadas = Decimal("5.00")
        contrato.save()
        gestor = data["gestor_cliente"]

        pedido = WorkflowService.criar_pedido(
            cliente=data["cliente"],
            contrato=contrato,
            solicitante=gestor,
            titulo="Demanda Crítica",
            descricao_geral="Incidente de produção",
        )

        ciclo = WorkflowService.decompor_pedido_em_ciclo(
            pedido=pedido,
            usuario=data["admin_empresa"],
            titulo_contexto="Atendimento Emergencial",
            tipo_manutencao=Ciclo.TipoManutencao.CORRETIVA,
            descricao_escopo="Hotfix",
            tarefas_data=[{"descricao": "Hotfix urgente", "horas_estimadas": "8.00"}],
        )

        WorkflowService.enviar_orcamento(ciclo, data["admin_empresa"])
        WorkflowService.aprovar_orcamento(ciclo, gestor)
        WorkflowService.iniciar_execucao_ciclo(ciclo, data["admin_empresa"])

        tarefa = ciclo.tarefas.first()
        WorkflowService.apontar_horas_tarefa(
            tarefa, data["tecnico"], Decimal("8.00"), concluida=True
        )
        WorkflowService.solicitar_aceite_ciclo(ciclo, data["admin_empresa"])

        # Aceite final deve gerar saldo de -3.00h sem erro
        contrato_atualizado = ContractService.deduzir_horas_ciclo(ciclo, gestor)

        assert contrato_atualizado.saldo_horas == Decimal("-3.00")
        assert contrato_atualizado.is_saldo_negativo is True

    def test_bloqueio_aceite_por_perfil_nao_autorizado(self, setup_data):
        """Garante que técnico ou usuário comum não pode registrar o aceite final."""
        data = setup_data
        contrato = data["contrato"]
        pedido = WorkflowService.criar_pedido(
            cliente=data["cliente"],
            contrato=contrato,
            solicitante=data["gestor_cliente"],
            titulo="Teste Permissão",
            descricao_geral="Desc",
        )
        ciclo = WorkflowService.decompor_pedido_em_ciclo(
            pedido=pedido,
            usuario=data["admin_empresa"],
            titulo_contexto="Ciclo Teste",
            tipo_manutencao=Ciclo.TipoManutencao.CORRETIVA,
            descricao_escopo="Desc",
            tarefas_data=[{"descricao": "T1", "horas_estimadas": "2.00"}],
        )
        WorkflowService.enviar_orcamento(ciclo, data["admin_empresa"])
        WorkflowService.aprovar_orcamento(ciclo, data["gestor_cliente"])
        WorkflowService.iniciar_execucao_ciclo(ciclo, data["admin_empresa"])
        WorkflowService.solicitar_aceite_ciclo(ciclo, data["admin_empresa"])

        with pytest.raises(PermissionDenied):
            ContractService.deduzir_horas_ciclo(ciclo, data["tecnico"])

        with pytest.raises(PermissionDenied):
            ContractService.deduzir_horas_ciclo(ciclo, data["usuario_cliente"])

    def test_transferencia_saldo_rollover_positivo_e_negativo(self, setup_data):
        """Valida transferência de saldo entre contratos com auditoria."""
        data = setup_data
        contrato1 = data["contrato"]
        contrato1.horas_consumidas = Decimal("20.00")  # saldo = 30.00h
        contrato1.save()

        contrato2 = Contrato.objects.create(
            numero_contrato="CTR-2027-001",
            cliente=data["cliente"],
            data_inicio=date(2027, 1, 1),
            data_fim=date(2027, 12, 31),
            horas_contratadas=Decimal("100.00"),
            status=Contrato.Status.ATIVO,
        )

        registro = ContractService.transferir_saldo(
            contrato_origem=contrato1,
            contrato_destino=contrato2,
            usuario=data["admin_empresa"],
            motivo="Renovação de Vigência",
        )

        assert registro.horas_transferidas == Decimal("30.00")
        contrato1.refresh_from_db()
        contrato2.refresh_from_db()
        assert contrato1.status == Contrato.Status.ENCERRADO
        assert contrato2.horas_herdadas == Decimal("30.00")
        assert contrato2.saldo_horas == Decimal("130.00")
