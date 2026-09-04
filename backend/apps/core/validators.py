import os
from django.core.exceptions import ValidationError

# Limite máximo de 25 MB por arquivo
TAMANHO_MAXIMO_ANEXO_BYTES = 25 * 1024 * 1024
TAMANHO_MAXIMO_ANEXO_MB = 25

# Extensões seguras permitidas (incluindo áudio .mp3)
EXTENSOES_PERMITIDAS = {
    # Documentos e planilhas
    "pdf", "docx", "doc", "xlsx", "xls", "csv", "txt", "odt", "ods", "rtf",
    # Imagens
    "png", "jpg", "jpeg", "webp", "gif", "svg",
    # Áudio
    "mp3", "wav", "ogg", "m4a",
    # Compactados
    "zip", "rar", "7z", "tar", "gz",
}

# Extensões perigosas estritamente bloqueadas
EXTENSOES_PROIBIDAS = {
    "exe", "bat", "cmd", "sh", "bin", "com", "scr", "vbs", "js", "msi", "jar", "apk", "app", "pif",
}


def extrair_extensao(nome_arquivo: str) -> str:
    """Extrai a extensão do arquivo em minúsculo e sem o ponto."""
    if not nome_arquivo:
        return ""
    _, ext = os.path.splitext(nome_arquivo)
    return ext.lower().lstrip(".")


def validar_arquivo_anexo(arquivo) -> None:
    """
    Valida se o arquivo não excede 25 MB e pertence à lista de extensões seguras autorizadas.
    Lança ValidationError caso viole as regras de governança.
    """
    if not arquivo:
        return

    nome = getattr(arquivo, "name", "")
    tamanho = getattr(arquivo, "size", 0)
    extensao = extrair_extensao(nome)

    if extensao in EXTENSOES_PROIBIDAS:
        raise ValidationError(
            f"O formato '.{extensao}' do arquivo '{nome}' é estritamente proibido por motivos de segurança."
        )

    if extensao not in EXTENSOES_PERMITIDAS:
        raise ValidationError(
            f"A extensão '.{extensao}' do arquivo '{nome}' não é permitida. "
            f"Formatos aceitos incluem documentos (PDF, DOCX, XLSX, TXT), imagens (PNG, JPG, WEBP), "
            f"áudio (MP3) e arquivos compactados (ZIP)."
        )

    if tamanho > TAMANHO_MAXIMO_ANEXO_BYTES:
        tamanho_mb = tamanho / (1024 * 1024)
        raise ValidationError(
            f"O arquivo '{nome}' possui {tamanho_mb:.1f} MB, excedendo o limite máximo permitido de {TAMANHO_MAXIMO_ANEXO_MB} MB."
        )
