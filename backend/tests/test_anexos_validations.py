import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.core.validators import (
    validar_arquivo_anexo,
    extrair_extensao,
    TAMANHO_MAXIMO_ANEXO_BYTES,
)


def test_extrair_extensao():
    assert extrair_extensao("documento.pdf") == "pdf"
    assert extrair_extensao("GRAVACAO.MP3") == "mp3"
    assert extrair_extensao("arquivo.tar.gz") == "gz"
    assert extrair_extensao("sem_extensao") == ""
    assert extrair_extensao("") == ""


def test_validar_arquivo_valido_mp3():
    audio = SimpleUploadedFile("audio_chamado.mp3", b"ID3 fake audio content", content_type="audio/mpeg")
    # Não deve lançar exceção
    validar_arquivo_anexo(audio)


def test_validar_arquivo_valido_pdf():
    pdf = SimpleUploadedFile("briefing.pdf", b"%PDF-1.4 fake content", content_type="application/pdf")
    validar_arquivo_anexo(pdf)


def test_validar_arquivo_valido_imagem_png():
    img = SimpleUploadedFile("print_erro.png", b"\x89PNG fake png content", content_type="image/png")
    validar_arquivo_anexo(img)


def test_validar_arquivo_tamanho_excedido_25mb():
    tamanho_acima = TAMANHO_MAXIMO_ANEXO_BYTES + 1024
    # Criamos um mock ou arquivo com size simulado
    arquivo_pesado = SimpleUploadedFile("pesado.pdf", b"x" * 100, content_type="application/pdf")
    arquivo_pesado.size = tamanho_acima

    with pytest.raises(ValidationError) as excinfo:
        validar_arquivo_anexo(arquivo_pesado)
    assert "excedendo o limite máximo permitido de 25 MB" in str(excinfo.value)


def test_validar_arquivo_extensao_proibida_exe():
    malicioso = SimpleUploadedFile("setup.exe", b"MZ fake binary", content_type="application/x-msdownload")
    with pytest.raises(ValidationError) as excinfo:
        validar_arquivo_anexo(malicioso)
    assert "estritamente proibido por motivos de segurança" in str(excinfo.value)


def test_validar_arquivo_extensao_proibida_script():
    script = SimpleUploadedFile("deploy.sh", b"#!/bin/bash echo oi", content_type="text/x-shellscript")
    with pytest.raises(ValidationError) as excinfo:
        validar_arquivo_anexo(script)
    assert "estritamente proibido por motivos de segurança" in str(excinfo.value)


def test_validar_arquivo_extensao_desconhecida():
    desconhecido = SimpleUploadedFile("disco.iso", b"fake iso", content_type="application/octet-stream")
    with pytest.raises(ValidationError) as excinfo:
        validar_arquivo_anexo(desconhecido)
    assert "não é permitida" in str(excinfo.value)
