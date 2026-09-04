import os
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.clientes.models import Cliente
from apps.contratos.models import Contrato
from apps.pedidos.models import Pedido
from apps.ciclos.models import Ciclo, TipoCiclo
from apps.comunicacao.models import Comentario, AnexoComentario

User = get_user_model()


@pytest.fixture
def base_comentarios(db):
    cliente = Cliente.objects.create(
        razao_social="Cliente Comentarios LTDA",
        nome_fantasia="Cliente Comentarios",
        cnpj="99888777000166",
        email_contato="contato@comentarios.com",
    )
    usuario = User.objects.create_user(
        username="autor_comentario",
        email="autor@empresa.com",
        role="EMPRESA_TECNICO",
    )
    contrato = Contrato.objects.create(
        numero="CT-2026-0002",
        cliente=cliente,
        horas_contratadas=Decimal("30.00"),
        saldo=Decimal("30.00"),
        data_inicio="2026-01-01",
        criado_por=usuario,
    )
    pedido = Pedido.objects.create(
        protocolo="OS2026090002",
        cliente=cliente,
        contrato=contrato,
        assunto="Demanda de comunicacao",
        descricao="Descricao detalhada",
        criado_por=usuario,
    )
    ciclo = Ciclo.objects.create(
        pedido=pedido,
        tipo=TipoCiclo.CORRETIVA,
        contexto="Ciclo para comentarios",
        operador=usuario,
    )
    return {
        "usuario": usuario,
        "ciclo": ciclo,
    }


@pytest.mark.django_db
def test_limpeza_fisica_arquivo_ao_excluir_anexo_comentario(base_comentarios):
    usuario = base_comentarios["usuario"]
    ciclo = base_comentarios["ciclo"]

    comentario = Comentario.objects.create(
        ciclo=ciclo,
        autor=usuario,
        texto="Comentário com anexo para teste de limpeza",
    )
    arquivo = SimpleUploadedFile("log_teste.txt", b"Conteudo do log para teste", content_type="text/plain")
    anexo = AnexoComentario.objects.create(
        comentario=comentario,
        arquivo=arquivo,
        nome_original="log_teste.txt",
        tamanho=len(b"Conteudo do log para teste"),
    )

    caminho_fisico = anexo.arquivo.path
    assert os.path.exists(caminho_fisico)

    # Ao excluir o anexo individualmente
    anexo.delete()

    # O arquivo físico em disco deve ter sido expurgado pelo signal
    assert not os.path.exists(caminho_fisico)


@pytest.mark.django_db
def test_limpeza_fisica_em_cascata_ao_excluir_comentario(base_comentarios):
    usuario = base_comentarios["usuario"]
    ciclo = base_comentarios["ciclo"]

    comentario = Comentario.objects.create(
        ciclo=ciclo,
        autor=usuario,
        texto="Mensagem com múltiplos anexos que será excluída",
    )
    anexo1 = AnexoComentario.objects.create(
        comentario=comentario,
        arquivo=SimpleUploadedFile("audio.mp3", b"ID3 fake audio", content_type="audio/mpeg"),
        nome_original="audio.mp3",
        tamanho=14,
    )
    anexo2 = AnexoComentario.objects.create(
        comentario=comentario,
        arquivo=SimpleUploadedFile("imagem.png", b"\x89PNG fake img", content_type="image/png"),
        nome_original="imagem.png",
        tamanho=13,
    )

    path1 = anexo1.arquivo.path
    path2 = anexo2.arquivo.path
    assert os.path.exists(path1)
    assert os.path.exists(path2)

    # Exclui o comentário pai
    comentario.delete()

    # Ambos os arquivos físicos devem ter sido apagados
    assert not os.path.exists(path1)
    assert not os.path.exists(path2)


@pytest.mark.django_db
def test_criacao_comentario_via_api_multipart_com_anexos(base_comentarios):
    from rest_framework.test import APIRequestFactory
    from apps.comunicacao.views import ComentarioViewSet

    usuario = base_comentarios["usuario"]
    ciclo = base_comentarios["ciclo"]
    factory = APIRequestFactory()

    # Envio com chave 'anexos'
    f1 = SimpleUploadedFile("audio_nota.mp3", b"ID3 fake audio", content_type="audio/mpeg")
    req1 = factory.post(
        "/api/v1/comunicacao/comentarios/",
        {"ciclo": ciclo.id, "texto": "Nota de audio no ciclo", "anexos": f1},
        format="multipart",
    )
    req1.user = usuario
    view = ComentarioViewSet.as_view({"post": "create", "get": "list"})
    res1 = view(req1)

    assert res1.status_code == 201
    assert len(res1.data["anexos"]) == 1
    assert res1.data["anexos"][0]["nome_original"] == "audio_nota.mp3"

    # Envio com chave 'arquivos'
    f2 = SimpleUploadedFile("relatorio.pdf", b"%PDF fake", content_type="application/pdf")
    req2 = factory.post(
        "/api/v1/comunicacao/comentarios/",
        {"ciclo": ciclo.id, "texto": "Relatorio anexado", "arquivos": f2},
        format="multipart",
    )
    req2.user = usuario
    res2 = view(req2)

    assert res2.status_code == 201
    assert len(res2.data["anexos"]) == 1
    assert res2.data["anexos"][0]["nome_original"] == "relatorio.pdf"

    # Verificação da listagem via GET: deve conter os anexos devidamente serializados
    req_list = factory.get(f"/api/v1/comunicacao/comentarios/?ciclo={ciclo.id}")
    req_list.user = usuario
    res_list = view(req_list)
    assert res_list.status_code == 200

    results = res_list.data.get("results", res_list.data) if isinstance(res_list.data, dict) else res_list.data
    assert len(results) >= 2
    for item in results:
        assert "anexos" in item
        assert len(item["anexos"]) >= 1

