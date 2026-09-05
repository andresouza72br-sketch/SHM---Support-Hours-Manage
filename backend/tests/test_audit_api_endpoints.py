import pytest
from decimal import Decimal
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.contratos.models import Contrato, StatusContrato
from apps.clientes.models import Cliente, TipoCliente, StatusCliente
from apps.contratos.forensic_service import ForensicAuditService, NivelRelevanciaAudit
from apps.accounts.models import UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def empresa_admin(db):
    return User.objects.create_superuser(
        username="admin_forensic",
        email="admin@forensic.com.br",
        password="password123",
        role=UserRole.EMPRESA_ADMIN,
    )


@pytest.fixture
def cliente_user(db):
    cli = Cliente.objects.create(
        tipo=TipoCliente.PJ,
        razao_social="Audit Client API Test Ltda",
        nome_fantasia="Audit API Client",
        cnpj="11222333000177",
        email_contato="cliente@auditapi.com.br",
        status=StatusCliente.ATIVO,
    )
    user = User.objects.create_user(
        username="gerente_audit",
        email="gerente@auditapi.com.br",
        password="password123",
        role=UserRole.CLIENTE_GERENTE,
        cliente=cli,
    )
    return user, cli


@pytest.fixture
def contrato_com_eventos(db, cliente_user, empresa_admin):
    user, cli = cliente_user
    contrato = Contrato.objects.create(
        numero="CT-AUDIT-2026-001",
        cliente=cli,
        status=StatusContrato.ATIVO,
        horas_contratadas=Decimal("40.00"),
        valor_mensal=Decimal("6000.00"),
        data_inicio=timezone.localdate(),
        criado_por=empresa_admin,
    )

    ForensicAuditService.registrar_evento(
        tipo_evento="CRIACAO_CONTRATO",
        descricao="Criação auditada do contrato",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato,
        justificativa="Homologação e assinatura pericial de contrato.",
        dados_payload={"numero": contrato.numero},
        usuario=empresa_admin,
    )

    ForensicAuditService.registrar_evento(
        tipo_evento="CONSUMO_HORAS",
        descricao="Consumo de horas em demanda",
        nivel_relevancia=NivelRelevanciaAudit.N2,
        contrato=contrato,
        dados_payload={"horas": "5.00"},
        usuario=empresa_admin,
    )

    return contrato


@pytest.mark.django_db
def test_trilha_forense_endpoint_retorna_elos_criptograficos(api_client, empresa_admin, contrato_com_eventos):
    api_client.force_authenticate(user=empresa_admin)
    url = f"/api/v1/contratos/{contrato_com_eventos.id}/trilha_forense/"
    res = api_client.get(url)

    assert res.status_code == status.HTTP_200_OK
    data = res.data
    registros = data if isinstance(data, list) else data.get("results", [])
    assert len(registros) == 2

    # Verifica campos periciais no elo mais recente
    ultimo = registros[0]
    assert "current_hash" in ultimo
    assert "previous_hash" in ultimo
    assert "payload_hash" in ultimo
    assert "sequencia" in ultimo
    assert len(ultimo["current_hash"]) == 64


@pytest.mark.django_db
def test_trilha_forense_filtro_por_nivel(api_client, empresa_admin, contrato_com_eventos):
    api_client.force_authenticate(user=empresa_admin)
    url = f"/api/v1/contratos/{contrato_com_eventos.id}/trilha_forense/?nivel=N1"
    res = api_client.get(url)

    assert res.status_code == status.HTTP_200_OK
    data = res.data
    registros = data if isinstance(data, list) else data.get("results", [])
    assert len(registros) == 1
    assert registros[0]["nivel_relevancia"] == "N1"


@pytest.mark.django_db
def test_verificar_integridade_endpoint_sucesso(api_client, empresa_admin, contrato_com_eventos):
    api_client.force_authenticate(user=empresa_admin)
    url = f"/api/v1/contratos/{contrato_com_eventos.id}/verificar_integridade/"
    res = api_client.get(url)

    assert res.status_code == status.HTTP_200_OK
    assert res.data["status"] == "integro"
    assert res.data["total_registros_verificados"] == 2
    assert res.data["contrato_numero"] == "CT-AUDIT-2026-001"
    assert len(res.data["ultimo_hash"]) == 64


@pytest.mark.django_db
def test_painel_integridade_permissao_e_dados(api_client, empresa_admin, cliente_user, contrato_com_eventos):
    user_cliente, _ = cliente_user
    url = "/api/v1/auditoria/painel_integridade/"

    # 1. Usuário cliente não deve ter acesso (403)
    api_client.force_authenticate(user=user_cliente)
    res_cliente = api_client.get(url)
    assert res_cliente.status_code == status.HTTP_403_FORBIDDEN

    # 2. Empresa admin acessa com sucesso (200)
    api_client.force_authenticate(user=empresa_admin)
    res_admin = api_client.get(url)
    assert res_admin.status_code == status.HTTP_200_OK
    assert res_admin.data["total_particoes"] >= 1
    assert res_admin.data["particoes_integras"] >= 1
    assert res_admin.data["particoes_rompidas"] == 0
    assert res_admin.data["total_eventos_auditados"] >= 2
