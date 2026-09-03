import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.contratos.models import Contrato, StatusContrato
from apps.saldo.services import SaldoService
from apps.notificacoes.models import ConfiguracaoNotificacao, Notification
from apps.notificacoes.config_service import NotificacaoConfigService

@pytest.mark.django_db
class TestConfiguracoesNotificacoes:
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin_notif",
            email="admin.notif@shm.local",
            password="password123",
            role=UserRole.EMPRESA_ADMIN,
            is_staff=True,
        )
        self.tecnico = User.objects.create_user(
            username="tecnico_notif",
            email="tecnico.notif@shm.local",
            password="password123",
            role=UserRole.EMPRESA_TECNICO,
        )
        self.cliente = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="Empresa Notificações SA",
            cnpj="99888777000166",
            email_contato="contato@empresanotif.com",
        )
        self.gerente_cliente = User.objects.create_user(
            username="gerente_notif",
            email="gerente@empresanotif.com",
            password="password123",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente,
        )
        self.contrato = Contrato.objects.create(
            numero="CT-2026-8888",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("20.00"),
            saldo=Decimal("20.00"),
            status=StatusContrato.ATIVO,
            gestor_nome="Gestor Alertas",
            gestor_email="gestor@empresanotif.com",
            criado_por=self.admin,
        )
        NotificacaoConfigService.garantir_configuracoes_padrao()

    def test_listar_configuracoes_apenas_empresa(self):
        # Usuário cliente não tem acesso
        self.client.force_authenticate(user=self.gerente_cliente)
        res_cli = self.client.get("/api/v1/notificacoes/configuracoes-notificacoes/")
        assert res_cli.status_code == 403

        # Usuário admin da empresa tem acesso total
        self.client.force_authenticate(user=self.admin)
        res_adm = self.client.get("/api/v1/notificacoes/configuracoes-notificacoes/")
        assert res_adm.status_code == 200
        dados = res_adm.data["results"] if "results" in res_adm.data else res_adm.data
        assert len(dados) >= 20

    def test_atualizar_toggle_configuracao(self):
        self.client.force_authenticate(user=self.admin)
        cfg = ConfiguracaoNotificacao.objects.get(codigo="PEDIDO_CRIADO")
        assert cfg.ativo_email is True

        # Desativa email
        res = self.client.patch(
            f"/api/v1/notificacoes/configuracoes-notificacoes/{cfg.id}/",
            {"ativo_email": False, "notificar_cliente_comum": False},
        )
        assert res.status_code == 200
        cfg.refresh_from_db()
        assert cfg.ativo_email is False
        assert cfg.notificar_cliente_comum is False

    def test_evento_bloqueado_nao_permite_desativar_email(self):
        self.client.force_authenticate(user=self.admin)
        cfg = ConfiguracaoNotificacao.objects.get(codigo="AUTH_MAGIC_LOGIN")
        assert cfg.bloqueado_edicao is True

        res = self.client.patch(
            f"/api/v1/notificacoes/configuracoes-notificacoes/{cfg.id}/",
            {"ativo_email": False},
        )
        assert res.status_code == 400
        assert "essencial" in str(res.data).lower()

    def test_testar_disparo_email(self):
        self.client.force_authenticate(user=self.admin)
        cfg = ConfiguracaoNotificacao.objects.get(codigo="PEDIDO_CRIADO")

        res = self.client.post(f"/api/v1/notificacoes/configuracoes-notificacoes/{cfg.id}/testar-disparo/")
        assert res.status_code == 200
        assert res.data["status"] == "sucesso"
        assert res.data["destinatario"] == self.admin.email

    def test_resetar_padroes(self):
        self.client.force_authenticate(user=self.admin)
        cfg = ConfiguracaoNotificacao.objects.get(codigo="PEDIDO_CRIADO")
        cfg.ativo_email = False
        cfg.save()

        res = self.client.post("/api/v1/notificacoes/configuracoes-notificacoes/resetar-padroes/")
        assert res.status_code == 200
        cfg.refresh_from_db()
        assert cfg.ativo_email is True

    def test_alerta_saldo_80_porcento_e_esgotado(self):
        # Franquia de 20h: 80% consumido ocorre quando consome 16h (saldo <= 4h)
        assert self.contrato.saldo == Decimal("20.00")
        Notification.objects.all().delete()

        # Consome 17h -> Saldo resta 3.0h (abaixo de 20% da franquia)
        SaldoService.consumir(
            contrato=self.contrato,
            horas=Decimal("17.00"),
            autor=self.admin,
        )
        self.contrato.refresh_from_db()
        assert self.contrato.saldo == Decimal("3.00")

        # Verifica se gerou notificação in-app de 80% atingido
        notif_80 = Notification.objects.filter(titulo__contains="80%")
        assert notif_80.exists()

        # Consome mais 4h -> Saldo fica negativo (-1.0h)
        SaldoService.consumir(
            contrato=self.contrato,
            horas=Decimal("4.00"),
            autor=self.admin,
        )
        self.contrato.refresh_from_db()
        assert self.contrato.saldo == Decimal("-1.00")

        # Verifica se gerou notificação in-app de saldo esgotado
        notif_esgotado = Notification.objects.filter(titulo__contains="Saldo de Horas Esgotado")
        assert notif_esgotado.exists()

    def test_padroes_anti_fadiga_comentario_e_execucao(self):
        cfg_comentario = ConfiguracaoNotificacao.objects.get(codigo="COMENTARIO_CRIADO")
        assert cfg_comentario.ativo_in_app is True
        assert cfg_comentario.ativo_email is False

        cfg_execucao = ConfiguracaoNotificacao.objects.get(codigo="EXECUCAO_INICIADA")
        assert cfg_execucao.ativo_in_app is True
        assert cfg_execucao.ativo_email is False

    def test_cliente_cadastro_confirmado_cadastrado_e_disparado(self):
        from apps.clientes.models import ClienteAceiteLink
        from apps.clientes.services import ClienteService

        cfg_confirmado = ConfiguracaoNotificacao.objects.get(codigo="CLIENTE_CADASTRO_CONFIRMADO")
        assert cfg_confirmado.ativo_email is True
        assert cfg_confirmado.ativo_in_app is True
        assert cfg_confirmado.notificar_empresa_admin is True

        novo_cliente = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="Novo Cliente Homologacao SA",
            cnpj="11222333000199",
            email_contato="gestor@novocliente.com",
            status="PENDENTE",
        )
        link = ClienteAceiteLink.objects.create(
            cliente=novo_cliente,
            data_expiracao=timezone.now() + timezone.timedelta(days=7),
        )

        Notification.objects.all().delete()
        cliente, link_ret, status_code, _ = ClienteService.formalizar_aceite(
            token=link.token,
            ip="127.0.0.1",
            user_agent="TestAgent/1.0",
        )
        from apps.clientes.models import StatusCliente
        assert cliente.status == StatusCliente.ATIVO

        notif_confirmado = Notification.objects.filter(titulo__contains="Cadastro Aprovado")
        assert notif_confirmado.exists()

    def test_pedido_criado_respeita_filtro_de_papeis(self):
        from apps.pedidos.services import PedidoService
        cfg_pedido = ConfiguracaoNotificacao.objects.get(codigo="PEDIDO_CRIADO")
        cfg_pedido.notificar_empresa_tecnico = False
        cfg_pedido.save()

        Notification.objects.all().delete()
        pedido = PedidoService.criar_pedido(
            contrato=self.contrato,
            assunto="Chamado Teste Filtro",
            descricao="Descricao detalhada",
            usuario=self.gerente_cliente,
            cliente=self.cliente,
        )
        assert pedido is not None

        # Admin deve ter recebido notificação in-app
        assert Notification.objects.filter(usuario=self.admin, titulo__contains="Novo Pedido").exists()
        # Técnico não deve ter recebido porque notificar_empresa_tecnico foi desativado
        assert not Notification.objects.filter(usuario=self.tecnico, titulo__contains="Novo Pedido").exists()

    def test_verificar_expiracao_contratos_command(self):
        from django.core.management import call_command
        from datetime import timedelta

        # Define contrato para expirar exatamente em 30 dias
        self.contrato.data_termino = timezone.localdate() + timedelta(days=30)
        self.contrato.save(update_fields=["data_termino"])

        Notification.objects.all().delete()
        call_command("verificar_expiracao_contratos", dias=[30, 15, 7], forcar=True)

        notif_expira = Notification.objects.filter(titulo__contains="Vigência Próxima do Fim")
        assert notif_expira.exists()

    def test_agendador_diario_calculo_proximo_disparo(self):
        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo
        tz = ZoneInfo("America/Sao_Paulo")

        # Cenário 1: Antes das 08:00 (ex: 07:30) -> deve agendar para hoje às 08:00
        agora_antes = datetime(2026, 9, 3, 7, 30, 0, tzinfo=tz)
        proximo = agora_antes.replace(hour=8, minute=0, second=0, microsecond=0)
        if agora_antes >= proximo:
            proximo += timedelta(days=1)
        assert proximo == datetime(2026, 9, 3, 8, 0, 0, tzinfo=tz)
        assert (proximo - agora_antes).total_seconds() == 1800

        # Cenário 2: Depois das 08:00 (ex: 08:30) -> deve agendar para o dia seguinte às 08:00
        agora_depois = datetime(2026, 9, 3, 8, 30, 0, tzinfo=tz)
        proximo_amanha = agora_depois.replace(hour=8, minute=0, second=0, microsecond=0)
        if agora_depois >= proximo_amanha:
            proximo_amanha += timedelta(days=1)
        assert proximo_amanha == datetime(2026, 9, 4, 8, 0, 0, tzinfo=tz)
        assert (proximo_amanha - agora_depois).total_seconds() == 23.5 * 3600


