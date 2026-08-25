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
