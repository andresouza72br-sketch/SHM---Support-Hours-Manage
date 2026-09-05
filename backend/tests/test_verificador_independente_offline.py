import json
import subprocess
import tempfile
import sys
from pathlib import Path
import pytest

# Obtém o conteúdo do script diretamente de frontend/src/utils/verificador_script.ts
SCRIPT_TS_PATH = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "utils" / "verificador_script.ts"

def extrair_script_python() -> str:
    content = SCRIPT_TS_PATH.read_text(encoding="utf-8")
    start_tag = 'export const SCRIPT_PYTHON_VERIFICADOR = `'
    end_tag = '`;'
    start_idx = content.find(start_tag)
    if start_idx == -1:
        raise ValueError("Tag de início do script Python não encontrada em verificador_script.ts")
    start_idx += len(start_tag)
    end_idx = content.find(end_tag, start_idx)
    return content[start_idx:end_idx].strip()

@pytest.fixture
def python_script_path(tmp_path):
    script_content = extrair_script_python()
    script_file = tmp_path / "verificador_independente.py"
    script_file.write_text(script_content, encoding="utf-8")
    return script_file

def test_script_python_extraido_executa_em_cadeia_valida(python_script_path, tmp_path):
    """
    Testa a execução do utilitário em linha de comando contra uma cadeia com 3 elos válidos.
    """
    # Importar diretamente o script gerado
    import importlib.util
    spec = importlib.util.spec_from_file_location("verificador_independente", python_script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    # Criação da cadeia de teste
    h0 = "0" * 64
    payload_1 = {"acao": "ACEITE", "horas": "10.00"}
    h1 = module.calcular_hash_evento(h0, payload_1)

    payload_2 = {"acao": "CONSUMO", "horas": "4.50"}
    h2 = module.calcular_hash_evento(h1, payload_2)

    eventos = [
        {
            "id": 1,
            "sequence_number": 1,
            "partition": "contrato:1",
            "previous_hash": h0,
            "current_hash": h1,
            "payload": payload_1
        },
        {
            "id": 2,
            "sequence_number": 2,
            "partition": "contrato:1",
            "previous_hash": h1,
            "current_hash": h2,
            "payload": payload_2
        }
    ]

    valido, logs, stats = module.validar_trilha_forense(eventos)
    assert valido is True
    assert stats["status_geral"] == "INTEGRA"
    assert stats["eventos_validos"] == 2

    # Executa via subprocess CLI
    json_path = tmp_path / "trilha.json"
    json_path.write_text(json.dumps({"eventos": eventos}), encoding="utf-8")

    res = subprocess.run(
        [sys.executable, str(python_script_path), "--arquivo", str(json_path)],
        capture_output=True,
        text=True
    )
    assert res.returncode == 0
    assert "INTEGRA" in res.stdout

def test_script_python_detecta_adulteracao_no_payload(python_script_path, tmp_path):
    """
    Testa que qualquer mutação no payload é detectada como fraude criptográfica.
    """
    import importlib.util
    spec = importlib.util.spec_from_file_location("verificador_independente", python_script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    h0 = "0" * 64
    payload_1 = {"acao": "ACEITE", "horas": "10.00"}
    h1 = module.calcular_hash_evento(h0, payload_1)

    # Forja de adulteração: valor alterado de 10.00 para 20.00 sem atualizar o hash
    payload_adulterado = {"acao": "ACEITE", "horas": "20.00"}
    eventos_forjados = [
        {
            "id": 1,
            "sequence_number": 1,
            "partition": "contrato:1",
            "previous_hash": h0,
            "current_hash": h1,
            "payload": payload_adulterado
        }
    ]

    valido, logs, stats = module.validar_trilha_forense(eventos_forjados)
    assert valido is False
    assert stats["status_geral"] == "ADULTERADA"
    assert stats["indice_corrompido"] == 1
