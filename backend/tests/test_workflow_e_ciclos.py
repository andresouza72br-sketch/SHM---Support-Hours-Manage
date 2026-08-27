import pytest
from decimal import Decimal
from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.contratos.models import Contrato, StatusContrato
from apps.pedidos.models import Pedido, StatusPedido, PrioridadePedido
from apps.ciclos.models import Ciclo, StatusCiclo, TipoCiclo
from apps.ciclos.services import CicloService
from apps.tarefas.models import Tarefa, StatusTarefa
from apps.saldo.models import HistoricoSaldo, TipoOperacaoSaldo
from apps.saldo.services import SaldoService

@pytest.mark.django_db
class TestWorkflowCiclosESaldo:
    def setup_method(self):
        self.admin = User.objects.create_user(
            username="admin_test",
            role=UserRole.EMPRESA_ADMIN,
            is_staff=True,
        )
        self.tecnico = User.objects.create_user(
            username="tecnico_test",
            role=UserRole.EMPRESA_TECNICO,
        )
        self.cliente = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="Cliente Teste S/A",
            cnpj="11222333000199",
            email_contato="cliente@teste.com",
        )
        self.gerente_cliente = User.objects.create_user(
            username="gerente_test",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente,
        )
        self.contrato = Contrato.objects.create(
            numero="CT-2026-0999",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("100.00"),
            saldo=Decimal("100.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )

    def test_ciclo_completo_com_debito_real_no_aceite(self):
        # 1. Criação do Pedido pelo Cliente
        pedido = Pedido.objects.create(
            protocolo="OS2026089999",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Correção urgente e melhoria de performance",
            descricao="Sistema com gargalo na consulta financeira.",
            prioridade=PrioridadePedido.ALTA,
            status=StatusPedido.ABERTO,
            criado_por=self.gerente_cliente,
        )
        assert pedido.status == StatusPedido.ABERTO

        # 2. Decomposição em Ciclo pela Empresa
        ciclo = CicloService.criar_ciclo(
            pedido_id=pedido.id,
            tipo=TipoCiclo.CORRETIVA,
            contexto="Otimização de índices e queries SQL",
            operador=self.tecnico,
            horas_estimadas=Decimal("10.00"),
        )
        assert ciclo.status == StatusCiclo.ORCADO
        pedido.refresh_from_db()
        assert pedido.status == StatusPedido.EM_ORCAMENTO

        # 3. Empresa apresenta Orçamento (10h estimadas)
        CicloService.apresentar_orcamento(ciclo, Decimal("10.00"))
        ciclo.refresh_from_db()
        pedido.refresh_from_db()
        assert ciclo.status == StatusCiclo.AGUARDANDO_APROVACAO
        assert pedido.status == StatusPedido.AGUARDANDO_APROVACAO

        # 4. Cliente Aprova o Orçamento (Saldo NÃO deve ser debitado aqui!)
        CicloService.aprovar_orcamento(ciclo, self.gerente_cliente)
        ciclo.refresh_from_db()
        self.contrato.refresh_from_db()
        assert ciclo.status == StatusCiclo.APROVADO
        assert self.contrato.saldo == Decimal("100.00")  # Saldo permanece intacto!

        # 5. Técnico inicia Execução e lança Tarefas Reais
        CicloService.iniciar_execucao(ciclo)
        ciclo.refresh_from_db()
        pedido.refresh_from_db()
        assert ciclo.status == StatusCiclo.EM_EXECUCAO
        assert pedido.status == StatusPedido.EM_EXECUCAO

        tarefa1 = Tarefa.objects.create(
            ciclo=ciclo,
            descricao="Análise e EXPLAIN query",
            horas_estimadas=Decimal("3.00"),
            horas_realizadas=Decimal("2.50"),
            status=StatusTarefa.REALIZADA,
            operador=self.tecnico,
        )
        tarefa2 = Tarefa.objects.create(
            ciclo=ciclo,
            descricao="Criação de índices compostos",
            horas_estimadas=Decimal("7.00"),
            horas_realizadas=Decimal("5.50"),
            status=StatusTarefa.REALIZADA,
            operador=self.tecnico,
        )
        ciclo.refresh_from_db()
        assert ciclo.horas_realizadas == Decimal("8.00")  # 2.50 + 5.50 = 8.00h

        # 6. Técnico solicita Aceite
        CicloService.solicitar_aceite(ciclo)
        ciclo.refresh_from_db()
        pedido.refresh_from_db()
        assert ciclo.status == StatusCiclo.AGUARDANDO_ACEITE
        assert pedido.status == StatusPedido.AGUARDANDO_ACEITE

        # 7. Cliente Concede o Aceite Final -> Débito das horas REAIS (8.00h)
        CicloService.aceitar_ciclo(ciclo, self.gerente_cliente)
        ciclo.refresh_from_db()
        pedido.refresh_from_db()
        self.contrato.refresh_from_db()

        assert ciclo.status == StatusCiclo.ACEITO
        assert pedido.status == StatusPedido.CONCLUIDO
        assert self.contrato.saldo == Decimal("92.00")  # 100 - 8 = 92h!
        assert self.contrato.horas_consumidas == Decimal("8.00")

        # Verifica histórico de saldo auditável
        historico = HistoricoSaldo.objects.filter(contrato=self.contrato, ciclo=ciclo).first()
        assert historico is not None
        assert historico.tipo_operacao == TipoOperacaoSaldo.CONSUMO
        assert historico.quantidade == Decimal("-8.00")
        assert historico.saldo_resultante == Decimal("92.00")

    def test_transferencia_saldo_entre_contratos_mesmo_cliente(self):
        contrato_destino = Contrato.objects.create(
            numero="CT-2026-1000",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("20.00"),
            saldo=Decimal("20.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )

        transf = SaldoService.transferir(
            contrato_origem_id=self.contrato.id,
            contrato_destino_id=contrato_destino.id,
            quantidade=Decimal("15.00"),
            autor=self.admin,
            motivo="Realocação de horas para novo projeto",
        )

        self.contrato.refresh_from_db()
        contrato_destino.refresh_from_db()

        assert self.contrato.saldo == Decimal("85.00")
        assert contrato_destino.saldo == Decimal("35.00")

    def test_aceite_ciclo_dentro_da_tolerancia_30_porcento(self):
        """Ciclo orçado em 10h com 13h realizadas (exatos 30% acima) deve ser aceito normalmente."""
        pedido = Pedido.objects.create(
            protocolo="OS2026089001",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Demanda Tolerância OK",
            descricao="Teste de tolerância dentro do limite",
            criado_por=self.gerente_cliente,
        )
        ciclo = CicloService.criar_ciclo(
            pedido_id=pedido.id,
            tipo=TipoCiclo.CORRETIVA,
            contexto="Ajustes permitidos",
            operador=self.tecnico,
            horas_estimadas=Decimal("10.00"),
        )
        CicloService.apresentar_orcamento(ciclo, Decimal("10.00"))
        CicloService.aprovar_orcamento(ciclo, self.gerente_cliente)
        CicloService.iniciar_execucao(ciclo)

        Tarefa.objects.create(
            ciclo=ciclo,
            descricao="Execução de tarefas até 13h",
            horas_realizadas=Decimal("13.00"),
            status="realizada",
        )
        ciclo.refresh_from_db()
        assert ciclo.horas_realizadas == Decimal("13.00")

        CicloService.solicitar_aceite(ciclo)
        CicloService.aceitar_ciclo(ciclo, self.gerente_cliente)
        ciclo.refresh_from_db()
        assert ciclo.status == StatusCiclo.ACEITO

    def test_aceite_ciclo_acima_da_tolerancia_30_porcento_bloqueado(self):
        """Ciclo orçado em 10h com 13.50h realizadas (35% acima) deve levantar ValidationError."""
        from django.core.exceptions import ValidationError
        import pytest

        pedido = Pedido.objects.create(
            protocolo="OS2026089002",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Demanda Tolerância Excedida",
            descricao="Teste de bloqueio acima de 30%",
            criado_por=self.gerente_cliente,
        )
        ciclo = CicloService.criar_ciclo(
            pedido_id=pedido.id,
            tipo=TipoCiclo.EVOLUTIVA,
            contexto="Excesso não autorizado",
            operador=self.tecnico,
            horas_estimadas=Decimal("10.00"),
        )
        CicloService.apresentar_orcamento(ciclo, Decimal("10.00"))
        CicloService.aprovar_orcamento(ciclo, self.gerente_cliente)
        CicloService.iniciar_execucao(ciclo)

        Tarefa.objects.create(
            ciclo=ciclo,
            descricao="Execução excessiva",
            horas_realizadas=Decimal("13.50"),
            status="realizada",
        )
        ciclo.refresh_from_db()
        assert ciclo.horas_realizadas == Decimal("13.50")

        CicloService.solicitar_aceite(ciclo)

        with pytest.raises(ValidationError) as excinfo:
            CicloService.aceitar_ciclo(ciclo, self.gerente_cliente)

        assert "limite de tolerância de 30%" in str(excinfo.value)