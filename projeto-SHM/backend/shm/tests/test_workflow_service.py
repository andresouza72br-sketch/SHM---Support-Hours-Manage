from datetime import date
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from shm.models.clients import Cliente
from shm.models.contracts import Contrato
from shm.models.requests import Ciclo, Pedido
from shm.models.users import Usuario
from shm.services.workflow_service import WorkflowService


@pytest.mark.django_db
class TestWorkflowService:
    @pytest.fixture
    def setup_data(self):
        cliente = Cliente.objects.create(
            razao_social="Cliente ABC S.A.",
            nome_fantasia="Cliente ABC",
            cnpj="99.888.777/0001-11",
            email_contato="suporte@abc.com",
        )
        gestor_cliente = Usuario.objects.create_user(
            email="gestor@abc.com",
            nome_completo="Carlos Gestor",
            tipo_perfil=Usuario.TipoPerfil.GESTOR_CLIENTE,
            cliente=cliente,
        )
        usuario_cliente = Usuario.objects.create_user(
            email="ana@abc.com",
            nome_completo="Ana Usuária",
            tipo_perfil=Usuario.TipoPerfil.USUARIO_CLIENTE,
            cliente=cliente,
        )
        gestor_suporte = Usuario.objects.create_user(
            email="suporte@empresa.com",
            nome_completo="Bruno Gestor Suporte",
            tipo_perfil=Usuario.TipoPerfil.GESTOR_SUPORTE,
        )
        tecnico = Usuario.objects.create_user(
            email="marcos@empresa.com",
            nome_completo="Marcos Dev",
            tipo_perfil=Usuario.TipoPerfil.TECNICO,
        )
        contrato = Contrato.objects.create(
            numero_contrato="CTR-ABC-2026",
            cliente=cliente,
            data_inicio=date(2026, 1, 1),
            data_fim=date(2026, 12, 31),
            horas_contratadas=Decimal("80.00"),
            status=Contrato.Status.ATIVO,
        )
        return {
            "cliente": cliente,
            "gestor_cliente": gestor_cliente,
            "usuario_cliente": usuario_cliente,
            "gestor_suporte": gestor_suporte,
            "tecnico": tecnico,
            "contrato": contrato,
        }

    def test_ciclo_completo_pedido_ate_aceite(self, setup_data):
        """Testa o fluxo ponta a ponta: Pedido -> Decomposição -> Orçamento -> Aprovação -> Execução -> Apontamento -> Aceite."""
        data = setup_data

        # 1. Usuário comum do cliente abre o pedido
        pedido = WorkflowService.criar_pedido(
            cliente=data["cliente"],
            contrato=data["contrato"],
            solicitante=data["usuario_cliente"],
            titulo="Correção no faturamento e melhoria no extrato",
            descricao_geral="Dois tópicos na mesma solicitação",
        )
        assert pedido.status == Pedido.Status.ABERTO

        # 2. Gestor de suporte decompõe em 2 ciclos
        ciclo_corretiva = WorkflowService.decompor_pedido_em_ciclo(
            pedido=pedido,
            usuario=data["gestor_suporte"],
            titulo_contexto="Bug cálculo de imposto",
            tipo_manutencao=Ciclo.TipoManutencao.CORRETIVA,
            descricao_escopo="Ajustar aliquota ICMS",
            tarefas_data=[
                {"descricao": "Ajuste na regra de cálculo", "horas_estimadas": "3.50"}
            ],
        )

        ciclo_evolutiva = WorkflowService.decompor_pedido_em_ciclo(
            pedido=pedido,
            usuario=data["gestor_suporte"],
            titulo_contexto="Exportação Excel do Extrato",
            tipo_manutencao=Ciclo.TipoManutencao.EVOLUTIVA,
            descricao_escopo="Criar botão de exportar XLS",
            tarefas_data=[
                {
                    "descricao": "Desenvolvimento do exportador",
                    "horas_estimadas": "5.00",
                }
            ],
        )

        pedido.refresh_from_db()
        assert pedido.status == Pedido.Status.EM_ANALISE
        assert pedido.ciclos.count() == 2

        # 3. Empresa envia os orçamentos
        WorkflowService.enviar_orcamento(ciclo_corretiva, data["gestor_suporte"])
        WorkflowService.enviar_orcamento(ciclo_evolutiva, data["gestor_suporte"])

        assert ciclo_corretiva.status == Ciclo.Status.AGUARDANDO_APROVACAO

        # 4. Gestor do cliente aprova a corretiva e rejeita a evolutiva pedindo revisão
        WorkflowService.aprovar_orcamento(ciclo_corretiva, data["gestor_cliente"])
        WorkflowService.rejeitar_orcamento(
            ciclo_evolutiva, data["gestor_cliente"], motivo="Horas muito altas"
        )

        assert ciclo_corretiva.status == Ciclo.Status.APROVADO
        assert ciclo_evolutiva.status == Ciclo.Status.REJEITADO

        # 5. Inicia execução da corretiva
        WorkflowService.iniciar_execucao_ciclo(ciclo_corretiva, data["gestor_suporte"])
        assert ciclo_corretiva.status == Ciclo.Status.EM_EXECUCAO

        # 6. Técnico aponta 3.00h (estimado era 3.50h) e conclui
        tarefa = ciclo_corretiva.tarefas.first()
        WorkflowService.apontar_horas_tarefa(
            tarefa, data["tecnico"], Decimal("3.00"), concluida=True
        )

        WorkflowService.solicitar_aceite_ciclo(ciclo_corretiva, data["gestor_suporte"])
        assert ciclo_corretiva.status == Ciclo.Status.AGUARDANDO_ACEITE

        # 7. Gestor do cliente dá o aceite
        WorkflowService.dar_aceite_ciclo(ciclo_corretiva, data["gestor_cliente"])

        ciclo_corretiva.refresh_from_db()
        contrato = data["contrato"]
        contrato.refresh_from_db()

        assert ciclo_corretiva.status == Ciclo.Status.ACEITO
        assert contrato.horas_consumidas == Decimal("3.00")
        assert contrato.saldo_horas == Decimal("77.00")

    def test_rejeicao_sem_motivo_dispara_validacao(self, setup_data):
        data = setup_data
        pedido = WorkflowService.criar_pedido(
            cliente=data["cliente"],
            contrato=data["contrato"],
            solicitante=data["gestor_cliente"],
            titulo="Pedido X",
            descricao_geral="Desc",
        )
        ciclo = WorkflowService.decompor_pedido_em_ciclo(
            pedido=pedido,
            usuario=data["gestor_suporte"],
            titulo_contexto="Ciclo X",
            tipo_manutencao=Ciclo.TipoManutencao.CORRETIVA,
            descricao_escopo="Desc",
            tarefas_data=[{"descricao": "T1", "horas_estimadas": "1.00"}],
        )
        WorkflowService.enviar_orcamento(ciclo, data["gestor_suporte"])

        with pytest.raises(ValidationError):
            WorkflowService.rejeitar_orcamento(
                ciclo, data["gestor_cliente"], motivo="   "
            )
