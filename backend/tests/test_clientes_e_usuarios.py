import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.clientes.models import Cliente, StatusCliente, TipoCliente, ClienteAuditLog, TipoEventoClienteAudit
from apps.contratos.models import Contrato, StatusContrato
from apps.accounts.models import UserRole, PasswordlessLoginToken

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def empresa_admin(db):
    return User.objects.create_superuser(
        username="admin_tellin",
        email="admin@tellin.com.br",
        password="password123",
        role=UserRole.EMPRESA_ADMIN,
    )

@pytest.fixture
def cliente_pj(db):
    # CNPJ válido de teste: 11.222.333/0001-81
    return Cliente.objects.create(
        tipo=TipoCliente.PJ,
        razao_social="Acme Soluções Corporativas Ltda",
        nome_fantasia="Acme Corp",
        cnpj="11222333000181",
        email_contato="contato@acme.com.br",
        pessoa_contato="Diretor Silva",
        cep="01310100",
        cidade="São Paulo",
        estado="SP",
        status=StatusCliente.ATIVO,
    )

@pytest.fixture
def cliente_outro(db):
    return Cliente.objects.create(
        tipo=TipoCliente.PJ,
        razao_social="Beta Inovações Ltda",
        nome_fantasia="Beta Tech",
        cnpj="11444777000161",
        email_contato="contato@beta.com.br",
        status=StatusCliente.ATIVO,
    )

@pytest.fixture
def cliente_gerente_user(db, cliente_pj):
    user = User.objects.create_user(
        username="gerente_acme",
        email="gerente@acme.com.br",
        password="password123",
        role=UserRole.CLIENTE_GERENTE,
        cliente=cliente_pj,
        first_name="Roberto",
        last_name="Gerente",
    )
    return user

@pytest.fixture
def cliente_analista_user(db, cliente_pj):
    user = User.objects.create_user(
        username="analista_acme",
        email="analista@acme.com.br",
        password="password123",
        role=UserRole.CLIENTE_ANALISTA,
        cliente=cliente_pj,
        first_name="Carlos",
        last_name="Analista",
    )
    return user


@pytest.mark.django_db
class TestClienteCadastroEUsuarios:
    def test_empresa_admin_cria_cliente_pj_valido(self, api_client, empresa_admin):
        api_client.force_authenticate(user=empresa_admin)
        payload = {
            "tipo": "PJ",
            "razao_social": "Delta Telecomunicações S.A.",
            "nome_fantasia": "Delta Telecom",
            "cnpj": "11222333000181",
            "email_contato": "financeiro@delta.com.br",
            "pessoa_contato": "Marcos Oliveira",
            "cep": "01001000",
            "cidade": "São Paulo",
            "estado": "SP",
            "status": "ativo",
        }
        res = api_client.post("/api/v1/clientes/", payload)
        assert res.status_code == 201
        assert res.data["nome_fantasia"] == "Delta Telecom"
        assert res.data["cnpj"] == "11222333000181"

    def test_bloqueio_cnpj_invalido(self, api_client, empresa_admin):
        api_client.force_authenticate(user=empresa_admin)
        payload = {
            "tipo": "PJ",
            "razao_social": "Empresa CNPJ Inválido",
            "nome_fantasia": "Fake CNPJ",
            "cnpj": "11111111111111",  # Dígitos repetitivos inválidos
            "email_contato": "fake@empresa.com",
        }
        res = api_client.post("/api/v1/clientes/", payload)
        assert res.status_code == 400
        assert "cnpj" in str(res.data).lower()

    def test_cliente_gerente_lista_usuarios_do_proprio_cliente(self, api_client, cliente_gerente_user, cliente_analista_user, cliente_pj):
        api_client.force_authenticate(user=cliente_gerente_user)
        res = api_client.get(f"/api/v1/clientes/{cliente_pj.id}/usuarios/")
        assert res.status_code == 200
        emails = [u["email"] for u in res.data]
        assert "gerente@acme.com.br" in emails
        assert "analista@acme.com.br" in emails

    def test_cliente_gerente_cadastra_novo_analista_com_convite(self, api_client, cliente_gerente_user, cliente_pj):
        api_client.force_authenticate(user=cliente_gerente_user)
        payload = {
            "email": "novo.analista@acme.com.br",
            "first_name": "Juliana",
            "last_name": "Mendes",
            "role": "CLIENTE_ANALISTA",
            "telefone": "11988887777",
        }
        res = api_client.post(f"/api/v1/clientes/{cliente_pj.id}/usuarios/", payload)
        assert res.status_code == 201
        assert res.data["user"]["email"] == "novo.analista@acme.com.br"

        # Verifica criação do User e do PasswordlessLoginToken de 48h
        novo_user = User.objects.get(email="novo.analista@acme.com.br")
        assert novo_user.cliente == cliente_pj
        assert novo_user.role == UserRole.CLIENTE_ANALISTA
        assert novo_user.is_active is True

        token_obj = PasswordlessLoginToken.objects.filter(user=novo_user).first()
        assert token_obj is not None
        assert token_obj.usado is False

    def test_anti_privilege_escalation_gerente_nao_pode_criar_admin(self, api_client, cliente_gerente_user, cliente_pj):
        api_client.force_authenticate(user=cliente_gerente_user)
        payload = {
            "email": "hacker@acme.com.br",
            "first_name": "Tentativa",
            "role": "EMPRESA_ADMIN",
        }
        res = api_client.post(f"/api/v1/clientes/{cliente_pj.id}/usuarios/", payload)
        assert res.status_code == 400 or res.status_code == 403

    def test_tenant_isolation_gerente_nao_acessa_outro_cliente(self, api_client, cliente_gerente_user, cliente_outro):
        api_client.force_authenticate(user=cliente_gerente_user)
        # Tentativa de listar usuários da Beta Tech
        res = api_client.get(f"/api/v1/clientes/{cliente_outro.id}/usuarios/")
        assert res.status_code in (403, 404)

    def test_alternar_status_usuario(self, api_client, cliente_gerente_user, cliente_analista_user, cliente_pj):
        api_client.force_authenticate(user=cliente_gerente_user)
        res = api_client.post(f"/api/v1/clientes/{cliente_pj.id}/usuarios/{cliente_analista_user.id}/alternar_status/")
        assert res.status_code == 200
        cliente_analista_user.refresh_from_db()
        assert cliente_analista_user.is_active is False

    def test_anti_lockout_gerente_nao_pode_desativar_a_si_mesmo(self, api_client, cliente_gerente_user, cliente_pj):
        api_client.force_authenticate(user=cliente_gerente_user)
        res = api_client.post(f"/api/v1/clientes/{cliente_pj.id}/usuarios/{cliente_gerente_user.id}/alternar_status/")
        assert res.status_code == 400
        cliente_gerente_user.refresh_from_db()
        assert cliente_gerente_user.is_active is True

    def test_criacao_cliente_gera_magic_link_7_dias(self, api_client, empresa_admin):
        api_client.force_authenticate(user=empresa_admin)
        payload = {
            "tipo": "PJ",
            "razao_social": "Gama Infraestrutura e Cloud Ltda",
            "nome_fantasia": "Gama Cloud",
            "cnpj": "11222333000181",
            "email_contato": "gestor@gamacloud.com.br",
            "pessoa_contato": "Felipe Gama",
            "cargo_contato": "CTO",
            "cep": "01001000",
            "cidade": "São Paulo",
            "estado": "SP",
        }
        res = api_client.post("/api/v1/clientes/", payload)
        assert res.status_code == 201
        cli_id = res.data["id"]

        cliente = Cliente.objects.get(id=cli_id)
        assert cliente.status == StatusCliente.PENDENTE_APROVACAO
        assert cliente.email_verificado is False
        assert cliente.email_verificado_em is None
        assert cliente.aprovado_em is None

        # Link de 7 dias criado
        link = cliente.aceite_links.first()
        assert link is not None
        assert link.usado is False
        delta_dias = (link.data_expiracao - link.criado_em).days
        assert delta_dias >= 6  # 7 dias corridos

    def test_fluxo_completo_aprovacao_magic_link_e_verificacao_email(self, api_client, empresa_admin):
        # 1. Cria cliente
        api_client.force_authenticate(user=empresa_admin)
        payload = {
            "tipo": "PJ",
            "razao_social": "Omega Sistemas Avançados Ltda",
            "nome_fantasia": "Omega Tech",
            "cnpj": "11222333000181",
            "email_contato": "contato@omegatech.com.br",
            "pessoa_contato": "Patricia Santos",
            "cargo_contato": "Diretora de Operações",
            "cep": "01310100",
            "cidade": "São Paulo",
            "estado": "SP",
        }
        res_create = api_client.post("/api/v1/clientes/", payload)
        assert res_create.status_code == 201
        cli_id = res_create.data["id"]
        cliente = Cliente.objects.get(id=cli_id)
        link = cliente.aceite_links.first()
        token = str(link.token)

        # 2. Usuário deslogado acessa o link seguro (GET)
        api_client.force_authenticate(user=None)
        res_get = api_client.get(f"/api/v1/clientes/aprovacao/{token}/")
        assert res_get.status_code == 200
        assert res_get.data["cliente"]["razao_social"] == "Omega Sistemas Avançados Ltda"
        assert res_get.data["cliente"]["email_contato"] == "contato@omegatech.com.br"
        assert res_get.data["expirado"] is False
        assert res_get.data["usado"] is False

        # 3. Usuário confirma e aprova o cadastro (POST)
        res_post = api_client.post(f"/api/v1/clientes/aprovacao/{token}/")
        assert res_post.status_code == 200
        assert res_post.data["email_verificado"] is True

        # Verifica banco de dados
        cliente.refresh_from_db()
        assert cliente.status == StatusCliente.ATIVO
        assert cliente.email_verificado is True
        assert cliente.email_verificado_em is not None
        assert cliente.aprovado_em is not None
        assert cliente.aprovado_por_nome == "Patricia Santos"
        assert cliente.aprovado_por_email == "contato@omegatech.com.br"

        # Link consumido
        link.refresh_from_db()
        assert link.usado is True

        # 4. Tentativa de aprovação duplicada retorna 409 Conflict
        res_dup = api_client.post(f"/api/v1/clientes/aprovacao/{token}/")
        assert res_dup.status_code == 409

    def test_reenvio_link_aprovacao(self, api_client, empresa_admin, cliente_pj):
        cliente_pj.status = StatusCliente.PENDENTE_APROVACAO
        cliente_pj.save()

        api_client.force_authenticate(user=empresa_admin)
        res = api_client.post(f"/api/v1/clientes/{cliente_pj.id}/reenviar_aprovacao/")
        assert res.status_code == 200
        assert "token" in res.data
        assert res.data["email_enviado"] is True

    def test_bloqueio_exclusao_cliente_com_contratos_vinculados(self, api_client, empresa_admin, cliente_pj):
        # Cria um contrato vinculado ao cliente
        Contrato.objects.create(
            numero="CT-2026-CLI-TEST",
            cliente=cliente_pj,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("30.00"),
            saldo=Decimal("30.00"),
            status=StatusContrato.ATIVO,
            criado_por=empresa_admin,
        )

        api_client.force_authenticate(user=empresa_admin)
        # Tentativa de excluir cliente com contratos deve falhar
        res = api_client.delete(f"/api/v1/clientes/{cliente_pj.id}/", {"justificativa": "Tentativa de remoção"}, format="json")
        assert res.status_code == 400
        assert "possui 1 contrato" in str(res.data) or "contrato" in str(res.data).lower()
        assert Cliente.objects.filter(id=cliente_pj.id).exists()

    def test_exclusao_cliente_sem_justificativa_retorna_400(self, api_client, empresa_admin, cliente_outro):
        api_client.force_authenticate(user=empresa_admin)
        # Sem justificativa ou justificativa < 5 caracteres
        res = api_client.delete(f"/api/v1/clientes/{cliente_outro.id}/", {"justificativa": "abc"}, format="json")
        assert res.status_code == 400
        assert "justificativa" in str(res.data).lower()
        assert Cliente.objects.filter(id=cliente_outro.id).exists()

    def test_usuario_nao_admin_nao_pode_excluir_cliente_retorna_403(self, api_client, cliente_gerente_user, cliente_outro):
        api_client.force_authenticate(user=cliente_gerente_user)
        res = api_client.delete(f"/api/v1/clientes/{cliente_outro.id}/", {"justificativa": "Tentativa indevida"}, format="json")
        assert res.status_code == 403

    def test_empresa_admin_exclui_cliente_sem_contratos_com_justificativa_e_auditoria_forense(self, api_client, empresa_admin):
        # 1. Cria cliente avulso sem contratos
        cliente_para_deletar = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="Zeta Tech Soluções Temporárias Ltda",
            nome_fantasia="Zeta Tech",
            cnpj="11222333000181",
            email_contato="contato@zetatech.com.br",
            status=StatusCliente.PENDENTE_APROVACAO,
        )
        cli_id = cliente_para_deletar.id
        cli_nome = cliente_para_deletar.display_name
        cli_doc = cliente_para_deletar.cnpj

        # 2. Executa exclusão auditada com justificativa técnica
        api_client.force_authenticate(user=empresa_admin)
        justificativa = "Cadastro duplicado por engano durante homologação de proposta."
        res = api_client.delete(f"/api/v1/clientes/{cli_id}/", {"justificativa": justificativa}, format="json")
        assert res.status_code == 200
        assert "excluído com sucesso" in res.data["detail"]

        # 3. Verifica que o cliente foi excluído do banco
        assert not Cliente.objects.filter(id=cli_id).exists()

        # 4. Verifica gravação indelével na trilha de auditoria forense
        audit = ClienteAuditLog.objects.filter(cliente_id=cli_id, tipo_evento=TipoEventoClienteAudit.EXCLUSAO).first()
        assert audit is not None
        assert audit.cliente_nome == cli_nome
        assert audit.cliente_documento == cli_doc
        assert audit.justificativa == justificativa
        assert audit.usuario == empresa_admin
        assert audit.usuario_email == "admin@tellin.com.br"
        assert audit.usuario_role == "Administrador" or "Admin" in audit.usuario_role or "EMPRESA_ADMIN" in audit.usuario_role

