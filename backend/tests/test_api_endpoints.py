import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.contratos.models import Contrato, StatusContrato
from apps.pedidos.models import Pedido, StatusPedido, PrioridadePedido
from apps.ciclos.models import Ciclo, StatusCiclo, TipoCiclo

@pytest.mark.django_db
class TestApiEndpoints:
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin_api",
            password="password123",
            role=UserRole.EMPRESA_ADMIN,
            is_staff=True,
        )
        self.cliente = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="Acme API Corp",
            cnpj="11222333000100",
            email_contato="api@acme.com",
        )
        self.gerente_cliente = User.objects.create_user(
            username="gerente_api",
            password="password123",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente,
        )
        self.contrato = Contrato.objects.create(
            numero="CT-2026-9001",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )

    def test_jwt_auth_e_me_endpoint(self):
        # 1. Login com credenciais válidas
        res = self.client.post("/api/v1/auth/token/", {"username": "admin_api", "password": "password123"})
        assert res.status_code == 200
        access_token = res.data["access"]
        assert access_token is not None

        # 2. Acesso ao endpoint Me
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        res_me = self.client.get("/api/v1/auth/me/")
        assert res_me.status_code == 200
        assert res_me.data["username"] == "admin_api"
        assert res_me.data["role"] == "EMPRESA_ADMIN"

    def test_magic_link_publico_sem_login(self):
        pedido = Pedido.objects.create(
            protocolo="OS2026089001",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Demanda pública",
            descricao="Teste de aprovação via link mágico",
            prioridade=PrioridadePedido.MEDIA,
            criado_por=self.gerente_cliente,
        )
        ciclo = Ciclo.objects.create(
            pedido=pedido,
            tipo=TipoCiclo.ANALISE,
            operador=self.admin,
            horas_estimadas=Decimal("5.00"),
            status=StatusCiclo.AGUARDANDO_APROVACAO,
        )

        # Acessa sem token de autenticação
        client_publico = APIClient()
        res = client_publico.get(f"/api/v1/ciclos/publico/{ciclo.token_acesso}/")
        assert res.status_code == 200
        assert res.data["pedido_protocolo"] == "OS2026089001"
        assert res.data["ciclo"]["status"] == "aguardando_aprovacao"

        # Aprova orçamento via Magic Link
        res_action = client_publico.post(
            f"/api/v1/ciclos/publico/{ciclo.token_acesso}/",
            {"acao": "aprovar"},
        )
        assert res_action.status_code == 200
        ciclo.refresh_from_db()
        assert ciclo.status == StatusCiclo.APROVADO

    def test_criar_pedido_por_empresa_e_cliente(self):
        from apps.notificacoes.models import Notification, TimelineEvent, TipoEventoTimeline

        # 1. Cria pedido com protocolo irregular pré-existente
        Pedido.objects.create(
            protocolo="OS202608MKT01",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Existente",
            descricao="Desc",
            criado_por=self.admin,
        )

        Notification.objects.all().delete()
        TimelineEvent.objects.all().delete()

        # 2. Cliente cria novo pedido
        self.client.force_authenticate(user=self.gerente_cliente)
        res_cli = self.client.post("/api/v1/pedidos/", {
            "contrato": self.contrato.id,
            "assunto": "Erro ao emitir relatório",
            "descricao": "Detalhes do erro do cliente",
            "prioridade": "alta",
        })
        assert res_cli.status_code == 201
        assert res_cli.data["protocolo"].startswith("OS202608")
        assert res_cli.data["cliente"] == self.cliente.id
        assert res_cli.data["assunto"] == "Erro ao emitir relatório"

        # Notificação enviada para a Empresa (admin), mas não para o autor (gerente_cliente)
        notifs_admin = Notification.objects.filter(usuario=self.admin)
        notifs_autor = Notification.objects.filter(usuario=self.gerente_cliente)
        assert notifs_admin.exists()
        assert not notifs_autor.exists()
        assert "Erro ao emitir relatório" in notifs_admin.first().mensagem or "Novo Pedido" in notifs_admin.first().titulo

        # Timeline event registrado
        timeline_events = TimelineEvent.objects.filter(pedido_id=res_cli.data["id"], tipo=TipoEventoTimeline.PEDIDO_CRIADO)
        assert timeline_events.exists()

        # 3. Empresa cria novo pedido
        Notification.objects.all().delete()
        self.client.force_authenticate(user=self.admin)
        res_adm = self.client.post("/api/v1/pedidos/", {
            "contrato": self.contrato.id,
            "assunto": "Abertura interna pelo suporte",
            "descricao": "Demanda originada internamente",
            "prioridade": "media",
        })
        assert res_adm.status_code == 201
        assert res_adm.data["protocolo"].startswith("OS202608")
        assert res_adm.data["cliente"] == self.cliente.id
        assert res_adm.data["protocolo"] != res_cli.data["protocolo"]

        # Notificação enviada para o Cliente (gerente_cliente), mas não para o autor (admin)
        notifs_cliente = Notification.objects.filter(usuario=self.gerente_cliente)
        notifs_autor_adm = Notification.objects.filter(usuario=self.admin)
        assert notifs_cliente.exists()
        assert not notifs_autor_adm.exists()

    def test_permissao_aprovacao_orcamento_somente_cliente_gerente(self):
        # Cria técnico da empresa
        tecnico = User.objects.create_user(
            username="tecnico_api",
            password="password123",
            role=UserRole.EMPRESA_TECNICO,
        )
        # Cria analista do cliente
        analista_cliente = User.objects.create_user(
            username="analista_api",
            password="password123",
            role=UserRole.CLIENTE_ANALISTA,
            cliente=self.cliente,
        )
        # Pedido e Ciclo aguardando aprovação
        pedido = Pedido.objects.create(
            protocolo="OS2026087777",
            cliente=self.cliente,
            contrato=self.contrato,
            assunto="Teste de permissão de aprovação",
            descricao="Verificando se técnico e analista são bloqueados",
            criado_por=self.gerente_cliente,
        )
        ciclo = Ciclo.objects.create(
            pedido=pedido,
            tipo=TipoCiclo.ANALISE,
            operador=tecnico,
            horas_estimadas=Decimal("4.00"),
            status=StatusCiclo.AGUARDANDO_APROVACAO,
        )

        # 1. Técnico da empresa tenta aprovar -> Bloqueado (403)
        self.client.force_authenticate(user=tecnico)
        res_tec = self.client.post(f"/api/v1/ciclos/{ciclo.id}/aprovar/")
        assert res_tec.status_code == 403

        # 2. Analista do cliente tenta aprovar -> Bloqueado (403)
        self.client.force_authenticate(user=analista_cliente)
        res_ana = self.client.post(f"/api/v1/ciclos/{ciclo.id}/aprovar/")
        assert res_ana.status_code == 403

        # 3. Gerente do cliente aprova -> Permitido (200)
        self.client.force_authenticate(user=self.gerente_cliente)
        res_ger = self.client.post(f"/api/v1/ciclos/{ciclo.id}/aprovar/")
        assert res_ger.status_code == 200
        ciclo.refresh_from_db()
        assert ciclo.status == StatusCiclo.APROVADO