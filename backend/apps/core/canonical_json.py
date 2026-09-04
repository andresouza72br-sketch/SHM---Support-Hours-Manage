import hashlib
import json
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

GENESIS_HASH = "0" * 64
EMPTY_PAYLOAD_HASH = hashlib.sha256(b"").hexdigest()


def _normalize_canonical_value(val: Any) -> Any:
    """
    Normaliza recursivamente estruturas de dados para conformidade com JSON Canônico (RFC 8785)
    e padronização de tipos primitivos (Decimais com 2 casas, datas ISO 8601, UUIDs e chaves ordenadas).
    """
    if isinstance(val, dict):
        return {k: _normalize_canonical_value(val[k]) for k in sorted(val.keys())}
    if isinstance(val, (list, tuple)):
        return [_normalize_canonical_value(item) for item in val]
    if isinstance(val, Decimal):
        return f"{val:.2f}"
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, uuid.UUID):
        return str(val)
    return val


def canonical_json_dumps(data: Any) -> str:
    """
    Serializa um objeto Python para JSON canônico determinístico (RFC 8785):
    - Ordenação alfabética estrita de chaves
    - Supressão total de espaços em branco (separadores compactos)
    - Codificação UTF-8 sem escape de caracteres não-ASCII
    - Padronização de valores decimais
    """
    if data is None or data == {}:
        return "{}"
    normalized = _normalize_canonical_value(data)
    return json.dumps(
        normalized,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def canonical_json_bytes(data: Any) -> bytes:
    """Retorna a representação em bytes UTF-8 do JSON canônico."""
    return canonical_json_dumps(data).encode("utf-8")


def sha256_canonical_json(data: Any) -> str:
    """
    Calcula a dispersão SHA-256 determinística da carga útil em formato canônico.
    Quando os dados forem vazios (None, {} ou ""), retorna o digest SHA-256 de string vazia.
    """
    if data is None or data == {} or data == "":
        return EMPTY_PAYLOAD_HASH
    return hashlib.sha256(canonical_json_bytes(data)).hexdigest()


def calculate_current_hash(
    previous_hash: str,
    sequencia: int,
    timestamp_iso: str,
    usuario_id: Any,
    tipo_evento: str,
    payload_hash: str,
) -> str:
    """
    Calcula o hash do elo pericial corrente concatenando de forma canônica os componentes
    mandatórios definidos em RN-10:
    previous_hash | sequencia | timestamp_iso | usuario_id | tipo_evento | payload_hash
    """
    prev = previous_hash or GENESIS_HASH
    user_str = str(usuario_id) if usuario_id is not None else ""
    token = f"{prev}|{sequencia}|{timestamp_iso}|{user_str}|{tipo_evento}|{payload_hash}"
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
