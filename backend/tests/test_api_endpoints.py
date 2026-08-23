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