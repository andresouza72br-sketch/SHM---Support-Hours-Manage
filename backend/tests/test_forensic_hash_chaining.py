import uuid
from decimal import Decimal
import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.core.canonical_json import GENESIS_HASH, EMPTY_PAYLOAD_HASH
from apps.contratos.models import (
    Contrato,
    ContratoAuditLog,
    ForensicAuditLog,
    NivelRelevanciaAudit,
    StatusContrato,
    TipoContrato,
)
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, ClienteAuditLog, TipoCliente
from apps.contratos.forensic_service import ForensicAuditService


@pytest.fixture
def usuario_admin(db):
    return User.objects.create_user(
        username=f"admin_{uuid.uuid4().hex[:6]}",
        email="admin@forense.com",
        password="password123",
        role=UserRole.EMPRESA_ADMIN,
    )


@pytest.fixture
def cliente_teste(db):
    return Cliente.objects.create(
        razao_social="Cliente Prova Forense LTDA",
        nome_fantasia="Cliente Prova Forense",
        cnpj="12.345.678/0001-90",
        email_contato="contato@clienteforense.com.br",
        tipo=TipoCliente.PJ,
    )


@pytest.fixture
def contrato_teste(db, cliente_teste, usuario_admin):
    return Contrato.objects.create(
        cliente=cliente_teste,
        numero=f"CT-{uuid.uuid4().hex[:8].upper()}",
        status=StatusContrato.ATIVO,
        tipo=TipoContrato.NOVO,
        horas_contratadas=Decimal("50.00"),
        valor_mensal=Decimal("10000.00"),
        data_inicio=timezone.localdate(),
        data_termino=timezone.localdate() + timezone.timedelta(days=365),
        criado_por=usuario_admin,
    )


@pytest.mark.django_db
def test_genesis_block_for_new_partition(contrato_teste):
    """Verifica se o primeiro elo de uma partição inicia com o bloco gênese (64 zeros) e sequência 1."""
    log = ForensicAuditService.registrar_evento(
        tipo_evento="CONTRATO_CRIACAO",
        descricao="Criação pericial do contrato",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato_teste,
        justificativa="Novo contrato firmado comercialmente",
        dados_payload={"numero": contrato_teste.numero, "horas": Decimal("50.00")},
    )

    assert log.sequencia == 1
    assert log.previous_hash == GENESIS_HASH
    assert len(log.current_hash) == 64
    assert log.particao == f"contrato:{contrato_teste.id}"


@pytest.mark.django_db
def test_sequential_hash_chaining(contrato_teste):
    """Verifica a sucessão contínua de elos onde previous_hash == current_hash anterior."""
    log1 = ForensicAuditService.registrar_evento(
        tipo_evento="CONTRATO_CRIACAO",
        descricao="Criação pericial",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato_teste,
        justificativa="Justificativa inicial válida",
    )

    log2 = ForensicAuditService.registrar_evento(
        tipo_evento="SALDO_REABASTECIMENTO",
        descricao="Acréscimo de 10 horas",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato_teste,
        justificativa="Compra avulsa de banco de horas",
        dados_payload={"horas_adicionadas": Decimal("10.00")},
    )

    log3 = ForensicAuditService.registrar_evento(
        tipo_evento="CONTRATO_DOWNLOAD_RELATORIO",
        descricao="Download do extrato pericial",
        nivel_relevancia=NivelRelevanciaAudit.N2,
        contrato=contrato_teste,
    )

    assert log2.sequencia == 2
    assert log2.previous_hash == log1.current_hash

    assert log3.sequencia == 3
    assert log3.previous_hash == log2.current_hash


@pytest.mark.django_db
def test_partition_isolation(cliente_teste, contrato_teste):
    """Garante que partições distintas (Contrato vs Global vs Cliente) são totalmente isoladas."""
    log_contrato = ForensicAuditService.registrar_evento(
        tipo_evento="CONTRATO_ATIVACAO",
        descricao="Ativação do contrato",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato_teste,
        justificativa="Ativação de contrato homologado",
    )

    log_global = ForensicAuditService.registrar_evento(
        tipo_evento="CONFIG_SISTEMA_ALTERADA",
        descricao="Alteração de parâmetro global",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        particao="global",
        justificativa="Ajuste de configuração sistêmica",
    )

    assert log_contrato.sequencia == 1
    assert log_contrato.previous_hash == GENESIS_HASH
    assert log_contrato.particao == f"contrato:{contrato_teste.id}"

    assert log_global.sequencia == 1
    assert log_global.previous_hash == GENESIS_HASH
    assert log_global.particao == "global"


@pytest.mark.django_db
def test_reflexive_double_write(contrato_teste, cliente_teste):
    """Garante escrita dupla reflexa em ContratoAuditLog e ClienteAuditLog."""
    # 1. Contrato
    ForensicAuditService.registrar_evento(
        tipo_evento="CONTRATO_CANCELAMENTO",
        descricao="Rescisão contratual",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        contrato=contrato_teste,
        justificativa="Rescisão solicitada pelo tomador de serviços",
    )

    contrato_legacy = ContratoAuditLog.objects.filter(contrato=contrato_teste).first()
    assert contrato_legacy is not None
    assert contrato_legacy.tipo_evento == "CONTRATO_CANCELAMENTO"
    assert "Rescisão contratual" in contrato_legacy.descricao
    assert "Rescisão solicitada" in contrato_legacy.justificativa

    # 2. Cliente
    ForensicAuditService.registrar_evento(
        tipo_evento="EXCLUSAO_CLIENTE",
        descricao="Exclusão do cliente",
        nivel_relevancia=NivelRelevanciaAudit.N1,
        cliente=cliente_teste,
        justificativa="Solicitação formal de exclusão LGPD",
    )

    cliente_legacy = ClienteAuditLog.objects.filter(cliente_id=cliente_teste.id).first()
    assert cliente_legacy is not None
    assert "Exclusão do cliente" in cliente_legacy.descricao
    assert "Solicitação formal" in cliente_legacy.justificativa


@pytest.mark.django_db
def test_mandatory_justification_validation(contrato_teste):
    """Verifica obrigatoriedade de justificativa com >= 10 caracteres em N1."""
    # Sem justificativa
    with pytest.raises(ValidationError) as exc1:
        ForensicAuditService.registrar_evento(
            tipo_evento="OPERACAO_CRITICA",
            descricao="Ação N1 sem justificativa",
            nivel_relevancia=NivelRelevanciaAudit.N1,
            contrato=contrato_teste,
            justificativa=None,
        )
    assert "mínimo 10 caracteres" in str(exc1.value)

    # Justificativa curta (< 10 caracteres)
    with pytest.raises(ValidationError) as exc2:
        ForensicAuditService.registrar_evento(
            tipo_evento="OPERACAO_CRITICA",
            descricao="Ação N1 com justificativa curta",
            nivel_relevancia=NivelRelevanciaAudit.N1,
            contrato=contrato_teste,
            justificativa="Curto",
        )
    assert "mínimo 10 caracteres" in str(exc2.value)

    # Nível 2 não exige justificativa
    log_n2 = ForensicAuditService.registrar_evento(
        tipo_evento="OPERACAO_OPERACIONAL",
        descricao="Ação N2 sem justificativa",
        nivel_relevancia=NivelRelevanciaAudit.N2,
        contrato=contrato_teste,
        justificativa=None,
    )
    assert log_n2 is not None
