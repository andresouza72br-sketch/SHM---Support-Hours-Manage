def get_client_ip(request) -> str:
    """
    Recupera o endereço IP real da requisição, considerando proxies e headers padrão.
    """
    if not request:
        return ""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR", "")
    return ip or ""

def get_client_user_agent(request) -> str:
    """
    Recupera o cabeçalho User-Agent da requisição HTTP.
    """
    if not request:
        return ""
    return request.META.get("HTTP_USER_AGENT", "") or ""


def calcular_hash_sha256(arquivo_ou_caminho) -> str:
    """
    Calcula o hash criptográfico SHA-256 de um arquivo ou conteúdo em streaming
    (blocos de 64KB) para máxima eficiência de memória.
    Suporta Django File/UploadedFile, bytes, caminhos em disco ou objetos com .chunks()/.read().
    """
    import hashlib

    if not arquivo_ou_caminho:
        return ""

    sha256 = hashlib.sha256()

    if isinstance(arquivo_ou_caminho, (bytes, bytearray)):
        sha256.update(arquivo_ou_caminho)
        return sha256.hexdigest()

    if isinstance(arquivo_ou_caminho, str):
        with open(arquivo_ou_caminho, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    # Django UploadedFile / File com suporte a chunks()
    if hasattr(arquivo_ou_caminho, "chunks"):
        pos = None
        try:
            if hasattr(arquivo_ou_caminho, "tell") and hasattr(arquivo_ou_caminho, "seek"):
                pos = arquivo_ou_caminho.tell()
                arquivo_ou_caminho.seek(0)
            for chunk in arquivo_ou_caminho.chunks(chunk_size=65536):
                sha256.update(chunk)
        finally:
            if pos is not None and hasattr(arquivo_ou_caminho, "seek"):
                try:
                    arquivo_ou_caminho.seek(pos)
                except Exception:
                    pass
        return sha256.hexdigest()

    # Arquivo aberto padrão ou File-like object
    if hasattr(arquivo_ou_caminho, "read"):
        pos = None
        try:
            if hasattr(arquivo_ou_caminho, "tell") and hasattr(arquivo_ou_caminho, "seek"):
                pos = arquivo_ou_caminho.tell()
                arquivo_ou_caminho.seek(0)
            for chunk in iter(lambda: arquivo_ou_caminho.read(65536), b""):
                sha256.update(chunk)
        finally:
            if pos is not None and hasattr(arquivo_ou_caminho, "seek"):
                try:
                    arquivo_ou_caminho.seek(pos)
                except Exception:
                    pass
        return sha256.hexdigest()

    return ""

