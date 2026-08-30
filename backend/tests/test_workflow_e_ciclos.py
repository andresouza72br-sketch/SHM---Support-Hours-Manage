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
            email="admin@empresa.com",
            role=UserRole.EMPRESA_ADMIN,
            is_staff=True,
        )
        self.tecnico = User.objects.create_user(
            username="tecnico_test",
            email="tecnico@empresa.com",
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
            email="gerente@teste.com",
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

    def test_aceite_ciclo_acima_da_tolerancia_30_porcento_sem_justificativa_bloqueado(self):
        """Ciclo orçado em 10h com 13.50h realizadas (35% acima) sem justificativa deve levantar ValidationError."""
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
        assert "justificativa de aprovação de exceção" in str(excinfo.value)

    def test_aceite_ciclo_acima_da_tolerancia_30_porcento_com_justificativa_sucesso(self):
        """Ciclo orçado em 10h com 14h realizadas (+40%) com justificativa formal é aceito e auditado."""
        from apps.contratos.models import ContratoAuditLog

        pedido = Pedido.objects.create(
            protocolo="OS2026089003",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Demanda Exceção Aprovada",
            descricao="Teste de aceite com justificativa formal",
            criado_por=self.gerente_cliente,
        )
        ciclo = CicloService.criar_ciclo(
            pedido_id=pedido.id,
            tipo=TipoCiclo.EVOLUTIVA,
            contexto="Complexidade ampliada",
            operador=self.tecnico,
            horas_estimadas=Decimal("10.00"),
        )
        CicloService.apresentar_orcamento(ciclo, Decimal("10.00"))
        CicloService.aprovar_orcamento(ciclo, self.gerente_cliente)
        CicloService.iniciar_execucao(ciclo)

        Tarefa.objects.create(
            ciclo=ciclo,
            descricao="Tarefas adicionais necessárias",
            horas_realizadas=Decimal("14.00"),
            status="realizada",
        )
        ciclo.refresh_from_db()
        assert ciclo.horas_realizadas == Decimal("14.00")

        CicloService.solicitar_aceite(ciclo)
        
        saldo_antes = self.contrato.saldo
        justificativa_texto = "Aprovado excedente devido à integração com API externa adicional"
        
        CicloService.aceitar_ciclo(
            ciclo,
            self.gerente_cliente,
            ip_origem="192.168.1.50",
            user_agent="Mozilla/5.0 Test",
            metodo="APP",
            justificativa_excedente=justificativa_texto,
        )
        
        ciclo.refresh_from_db()
        self.contrato.refresh_from_db()
        
        assert ciclo.status == StatusCiclo.ACEITO
        assert self.contrato.saldo == saldo_antes - Decimal("14.00")
        
        # Valida registro de auditoria forense do contrato
        audit = ContratoAuditLog.objects.filter(
            contrato=self.contrato,
            justificativa__contains=justificativa_texto
        ).first()
        assert audit is not None
        assert "Aceite de exceção formalizado" in audit.descricao

    def test_reenvio_magic_link_ciclo_aprovacao_e_aceite(self):
        """Testa reenvio de magic link para ciclos em aguardando_aprovacao e aguardando_aceite."""
        from django.core import mail
        from django.core.exceptions import ValidationError
        from apps.ciclos.models import TipoAcaoMagicLink

        mail.outbox.clear()
        pedido = Pedido.objects.create(
            protocolo="OS2026089004",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Demanda Reenvio Magic Link",
            descricao="Teste de reenvio de links seguros",
            criado_por=self.gerente_cliente,
        )
        ciclo = CicloService.criar_ciclo(
            pedido_id=pedido.id,
            tipo=TipoCiclo.CORRETIVA,
            contexto="Correção com reenvio",
            operador=self.tecnico,
            horas_estimadas=Decimal("6.00"),
        )
        # 1. Bloqueado em status ORCADO
        with pytest.raises(ValidationError):
            CicloService.reenviar_magic_link(ciclo, self.tecnico)

        # 2. Apresenta orçamento -> AGUARDANDO_APROVACAO
        CicloService.apresentar_orcamento(ciclo, Decimal("6.00"))
        ciclo.refresh_from_db()
        token_antigo = ciclo.token_acesso

        # Reenvia Magic Link de Orçamento
        mail.outbox.clear()
        ciclo_renovado, link_renovado = CicloService.reenviar_magic_link(ciclo, self.tecnico)
        assert link_renovado.tipo_acao == TipoAcaoMagicLink.APROVACAO_ORCAMENTO
        assert link_renovado.token == ciclo_renovado.token_acesso
        assert link_renovado.token != token_antigo
        assert len(mail.outbox) >= 1
        assert "Orçamento Apresentado" in mail.outbox[-1].subject

        # 3. Aprova e Inicia Execução -> Bloqueado em EM_EXECUCAO
        CicloService.aprovar_orcamento(ciclo, self.gerente_cliente)
        CicloService.iniciar_execucao(ciclo)
        ciclo.refresh_from_db()
        with pytest.raises(ValidationError):
            CicloService.reenviar_magic_link(ciclo, self.tecnico)

        # 4. Solicita aceite -> AGUARDANDO_ACEITE
        CicloService.solicitar_aceite(ciclo)
        ciclo.refresh_from_db()
        token_aceite_antigo = ciclo.token_acesso

        # Reenvia Magic Link de Aceite
        mail.outbox.clear()
        ciclo_aceite_renovado, link_aceite_renovado = CicloService.reenviar_magic_link(ciclo, self.tecnico)
        assert link_aceite_renovado.tipo_acao == TipoAcaoMagicLink.ACEITE_CICLO
        assert link_aceite_renovado.token == ciclo_aceite_renovado.token_acesso
        assert link_aceite_renovado.token != token_aceite_antigo
        assert len(mail.outbox) >= 1
        assert "Aceite Solicitado" in mail.outbox[-1].subject

    def test_api_endpoint_reenviar_magic_link(self):
        """Testa o endpoint POST /api/v1/ciclos/{id}/reenviar_magic_link/ via REST API."""
        from rest_framework.test import APIClient
        from django.core import mail

        mail.outbox.clear()
        client = APIClient()
        client.force_authenticate(user=self.admin)

        pedido = Pedido.objects.create(
            protocolo="OS2026089005",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Demanda API Reenvio",
            descricao="Teste endpoint REST",
            criado_por=self.gerente_cliente,
        )
        ciclo = CicloService.criar_ciclo(
            pedido_id=pedido.id,
            tipo=TipoCiclo.ANALISE,
            contexto="Análise técnica",
            operador=self.tecnico,
            horas_estimadas=Decimal("5.00"),
        )
        CicloService.apresentar_orcamento(ciclo, Decimal("5.00"))

        response = client.post(f"/api/v1/ciclos/{ciclo.id}/reenviar_magic_link/")
        assert response.status_code == 200
        data = response.json()
        assert "magic_link_token" in data
        assert "expira_em" in data
        assert data["ciclo"]["id"] == ciclo.id

    def test_disparo_email_passwordless_login(self):
        """Testa disparo de e-mail transacional no login passwordless avulso."""
        from rest_framework.test import APIClient
        from django.core import mail

        mail.outbox.clear()
        client = APIClient()
        response = client.post("/api/v1/auth/magic-link/request/", {"email": self.gerente_cliente.email})
        assert response.status_code == 200
        assert len(mail.outbox) == 1

        email_enviado = mail.outbox[0]
        assert "Link de Acesso" in email_enviado.subject
        assert self.gerente_cliente.email in email_enviado.to
        assert "/magic-link/" in email_enviado.body

    def test_fallback_email_contato_quando_cliente_sem_gerente(self):
        """Testa fallback para Cliente.email_contato quando não há usuário CLIENTE_GERENTE ativo."""
        from django.core import mail

        mail.outbox.clear()
        cliente_sem_gerente = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="Empresa Sem Gerente Cadastrado LTDA",
            cnpj="99888777000166",
            email_contato="contato.diretoria@semgerente.com.br",
        )
        contrato2 = Contrato.objects.create(
            numero="CT-2026-0998",
            cliente=cliente_sem_gerente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        pedido = Pedido.objects.create(
            protocolo="OS2026089006",
            cliente=cliente_sem_gerente,
            contrato=contrato2,
            assunto="Demanda Sem Gerente",
            descricao="Fallback email contato",
            criado_por=self.admin,
        )
        ciclo = CicloService.criar_ciclo(
            pedido_id=pedido.id,
            tipo=TipoCiclo.PREVENTIVA,
            contexto="Manutenção preventiva",
            operador=self.tecnico,
            horas_estimadas=Decimal("4.00"),
        )
        CicloService.apresentar_orcamento(ciclo, Decimal("4.00"))

        assert len(mail.outbox) >= 1
        ultimo_email = mail.outbox[-1]
        assert "contato.diretoria@semgerente.com.br" in ultimo_email.to

    def test_copia_cc_emails_notificacao_padrao_cliente(self):
        """Testa envio de e-mails em cópia (CC) cadastrados em emails_notificacao_padrao."""
        from django.core import mail

        mail.outbox.clear()
        self.cliente.emails_notificacao_padrao = [
            "fiscal@cliente.com",
            "diretoria@cliente.com",
        ]
        self.cliente.save(update_fields=["emails_notificacao_padrao"])

        pedido = Pedido.objects.create(
            protocolo="OS2026089007",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Demanda com CC Padrão",
            descricao="Teste envio CC",
            criado_por=self.gerente_cliente,
        )
        ciclo = CicloService.criar_ciclo(
            pedido_id=pedido.id,
            tipo=TipoCiclo.CORRETIVA,
            contexto="Correção com CC",
            operador=self.tecnico,
            horas_estimadas=Decimal("3.00"),
        )
        CicloService.apresentar_orcamento(ciclo, Decimal("3.00"))

        assert len(mail.outbox) >= 1
        ultimo_email = mail.outbox[-1]
        assert "fiscal@cliente.com" in ultimo_email.cc
        assert "diretoria@cliente.com" in ultimo_email.cc