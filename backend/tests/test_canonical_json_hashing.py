import hashlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest

from apps.core.canonical_json import (
    GENESIS_HASH,
    EMPTY_PAYLOAD_HASH,
    canonical_json_dumps,
    canonical_json_bytes,
    sha256_canonical_json,
    calculate_current_hash,
)


def test_empty_payload_hash():
    """Verifica se payload vazio produz o hash SHA-256 padrão de string vazia."""
    expected_empty = hashlib.sha256(b"").hexdigest()
    assert expected_empty == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    assert sha256_canonical_json(None) == expected_empty
    assert sha256_canonical_json({}) == expected_empty
    assert sha256_canonical_json("") == expected_empty


def test_canonical_json_key_sorting():
    """Verifica ordenação estrita e recursiva de chaves de dicionário."""
    dict_a = {"z": 1, "a": 2, "m": {"b": 3, "a": 4}}
    dict_b = {"a": 2, "m": {"a": 4, "b": 3}, "z": 1}

    dump_a = canonical_json_dumps(dict_a)
    dump_b = canonical_json_dumps(dict_b)

    assert dump_a == dump_b
    assert dump_a == '{"a":2,"m":{"a":4,"b":3},"z":1}'
    assert sha256_canonical_json(dict_a) == sha256_canonical_json(dict_b)


def test_canonical_json_no_whitespace():
    """Garante supressão de espaços após vírgulas e dois-pontos."""
    payload = {"status": "ativo", "horas": 10, "itens": [1, 2, 3]}
    res = canonical_json_dumps(payload)
    assert " " not in res
    assert res == '{"horas":10,"itens":[1,2,3],"status":"ativo"}'


def test_decimal_formatting_two_places():
    """Garante que decimais são padronizados com duas casas decimais."""
    payload = {
        "valor_decimal": Decimal("15.5"),
        "valor_zero": Decimal("10"),
        "valor_redondo": Decimal("100.00"),
    }
    dump = canonical_json_dumps(payload)
    assert '"valor_decimal":"15.50"' in dump
    assert '"valor_zero":"10.00"' in dump
    assert '"valor_redondo":"100.00"' in dump


def test_datetime_and_uuid_handling():
    """Garante que datas e UUIDs são convertidos deterministicamente."""
    uid = uuid.UUID("12345678-1234-5678-1234-567812345678")
    dt = datetime(2026, 9, 4, 18, 30, 0, tzinfo=timezone.utc)

    payload = {"id": uid, "momento": dt}
    dump = canonical_json_dumps(payload)

    assert f'"id":"{uid}"' in dump
    assert '"momento":"2026-09-04T18:30:00+00:00"' in dump


def test_hash_determinism_across_shuffles():
    """Testa determinismo sob ordens aleatórias de inserção de chaves."""
    import random

    keys = [f"key_{i:02d}" for i in range(20)]
    base_dict = {k: i * 1.5 for i, k in enumerate(keys)}
    canonical_hash = sha256_canonical_json(base_dict)

    for _ in range(25):
        shuffled_keys = list(keys)
        random.shuffle(shuffled_keys)
        shuffled_dict = {k: base_dict[k] for k in shuffled_keys}
        assert sha256_canonical_json(shuffled_dict) == canonical_hash


def test_calculate_current_hash_chaining():
    """Testa cálculo do current_hash com todos os componentes mandatórios."""
    prev_hash = GENESIS_HASH
    seq = 1
    ts = "2026-09-04T18:30:00.000000Z"
    user_id = 42
    tipo_evento = "SALDO_CONSUMO_CICLO"
    payload_hash = sha256_canonical_json({"horas": Decimal("6.00")})

    curr_hash = calculate_current_hash(
        previous_hash=prev_hash,
        sequencia=seq,
        timestamp_iso=ts,
        usuario_id=user_id,
        tipo_evento=tipo_evento,
        payload_hash=payload_hash,
    )

    assert isinstance(curr_hash, str)
    assert len(curr_hash) == 64

    # Qualquer alteração em qualquer parâmetro altera o hash
    altered_hash = calculate_current_hash(
        previous_hash=prev_hash,
        sequencia=2,  # alterado
        timestamp_iso=ts,
        usuario_id=user_id,
        tipo_evento=tipo_evento,
        payload_hash=payload_hash,
    )
    assert curr_hash != altered_hash
