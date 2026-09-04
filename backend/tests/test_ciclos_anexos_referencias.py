import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.clientes.models import Cliente
from apps.contratos.models import Contrato
from apps.pedidos.models import Pedido, AnexoPedido
from apps.ciclos.models import Ciclo, TipoCiclo, StatusCiclo

User = get_user_model()


@pytest.fixture
def ambiente_teste(db):
    cliente = Cliente.objects.create(
        razao_social="Cliente Teste LTDA",
        nome_fantasia="Cliente Teste",
        cnpj="11222333000199",
        email_contato="contato@cliente.com",
    )
    usuario_empresa = User.objects.create_user(
        username="operador_teste",
        email="operador@empresa.com",
        first_name="Operador",
        last_name="Técnico",
        role="EMPRESA_TECNICO",
    )
    usuario_cliente = User.objects.create_user(
        username="cliente_user",
        email="user@cliente.com",
        first_name="João",
        cliente=cliente,
        role="CLIENTE_GERENTE",
    )
    contrato = Contrato.objects.create(
        numero="CT-2026-0001",
        cliente=cliente,
        horas_contratadas=Decimal("50.00"),
        saldo=Decimal("50.00"),
        data_inicio="2026-01-01",
        criado_por=usuario_empresa,
    )
    pedido = Pedido.objects.create(
        protocolo="OS2026090001",
        cliente=cliente,
        contrato=contrato,
        assunto="Problema na emissão de relatório",
        descricao="Descrição do problema",
        criado_por=usuario_cliente,
    )
    return {
        "cliente": cliente,
        "contrato": contrato,
        "operador": usuario_empresa,
        "usuario_cliente": usuario_cliente,
        "pedido": pedido,
    }


@pytest.mark.django_db
def test_multi_referencia_anexo_pedido_em_multiplos_ciclos(ambiente_teste):
    pedido = ambiente_teste["pedido"]
    operador = ambiente_teste["operador"]

    # 1. Criar um anexo no pedido
    arquivo_mock = SimpleUploadedFile("briefing_arquitetura.pdf", b"%PDF-1.4 mock content", content_type="application/pdf")
    anexo = AnexoPedido.objects.create(
        pedido=pedido,
        arquivo=arquivo_mock,
        nome_original="briefing_arquitetura.pdf",
        tamanho=1024,
        criado_por=ambiente_teste["usuario_cliente"],
    )

    # 2. Criar 2 ciclos no mesmo pedido
    ciclo1 = Ciclo.objects.create(
        pedido=pedido,
        tipo=TipoCiclo.CORRETIVA,
        contexto="Ciclo 1: Ajuste de query",
        operador=operador,
        horas_estimadas=Decimal("3.00"),
    )
    ciclo2 = Ciclo.objects.create(
        pedido=pedido,
        tipo=TipoCiclo.TESTE,
        contexto="Ciclo 2: Homologação e validação",
        operador=operador,
        horas_estimadas=Decimal("1.50"),
    )

    # 3. Multi-referência: associar o mesmo anexo a ambos os ciclos
    ciclo1.anexos_pedido.add(anexo)
    ciclo2.anexos_pedido.add(anexo)

    # 4. Verificações
    assert ciclo1.anexos_pedido.filter(id=anexo.id).exists()
    assert ciclo2.anexos_pedido.filter(id=anexo.id).exists()
    assert anexo.ciclos_referenciados.count() == 2

    # 5. Desvincular do Ciclo 1
    ciclo1.anexos_pedido.remove(anexo)

    # Deve continuar associado ao Ciclo 2 e íntegro no Pedido
    assert not ciclo1.anexos_pedido.filter(id=anexo.id).exists()
    assert ciclo2.anexos_pedido.filter(id=anexo.id).exists()
    assert pedido.anexos.filter(id=anexo.id).exists()
