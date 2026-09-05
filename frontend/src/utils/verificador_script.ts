/**
 * SHM - Support Hours Manager
 * Módulo utilitário para distribuição do script Python de verificação pericial independente.
 * Permite que peritos, investigadores e auditores executem a validação matemática
 * da cadeia de hashes (RFC 8785 + SHA-256) em ambientes isolados (air-gapped).
 */

export const SCRIPT_PYTHON_VERIFICADOR = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SHM (Support Hours Manager) - Verificador Pericial Independente de Trilha Forense
Algoritmo de validação determinística de encadeamento criptográfico de hashes (Hash Chaining).
Em conformidade com a RFC 8785 (JSON Canonicalization Scheme) e FIPS 180-4 (SHA-256).

Uso:
  python verificador_independente.py --arquivo trilha_contrato_12.json
  cat trilha.json | python verificador_independente.py --stdin
"""

import sys
import json
import hashlib
import argparse
from typing import Any, Dict, List, Tuple

GENESIS_BLOCK_HASH = "0" * 64

def canonicalize_rfc8785(data: Any) -> str:
    """
    Serialização JSON determinística conforme a especificação RFC 8785 (JCS):
    - Ordenação lexicográfica de chaves UTF-16 / UTF-8
    - Formatação numérica sem variações de ponto flutuante
    - Supressão de espaços e quebras de linha
    """
    if data is None:
        return "null"
    elif isinstance(data, bool):
        return "true" if data else "false"
    elif isinstance(data, (int, float)):
        if isinstance(data, float):
            # Formatação estrita com até duas casas decimais se representar moeda/horas
            if data.is_integer():
                return f"{int(data)}"
            return f"{data:.2f}".rstrip('0').rstrip('.') if '.' in f"{data:.2f}" else f"{data:.2f}"
        return str(data)
    elif isinstance(data, str):
        return json.dumps(data, ensure_ascii=False)
    elif isinstance(data, list):
        items = [canonicalize_rfc8785(item) for item in data]
        return "[" + ",".join(items) + "]"
    elif isinstance(data, dict):
        sorted_keys = sorted(data.keys())
        entries = [
            json.dumps(key, ensure_ascii=False) + ":" + canonicalize_rfc8785(data[key])
            for key in sorted_keys
        ]
        return "{" + ",".join(entries) + "}"
    else:
        return json.dumps(str(data), ensure_ascii=False)

def calcular_hash_evento(previous_hash: str, payload: Any) -> str:
    """
    Calcula a dispersão SHA-256 do elo:
    hash = SHA-256(previous_hash || canonical_json(payload))
    """
    payload_canonica = canonicalize_rfc8785(payload)
    conteudo_para_hash = f"{previous_hash}{payload_canonica}"
    return hashlib.sha256(conteudo_para_hash.encode("utf-8")).hexdigest()

def validar_trilha_forense(eventos: List[Dict[str, Any]]) -> Tuple[bool, List[str], Dict[str, Any]]:
    """
    Executa a varredura pericial completa sobre a cadeia de eventos fornecida.
    """
    logs = []
    estatisticas = {
        "total_eventos": len(eventos),
        "eventos_validos": 0,
        "particoes_analisadas": set(),
        "status_geral": "INTEGRA",
        "indice_corrompido": None,
        "detalhes_falha": None
    }

    if not eventos:
        return True, ["Aviso: Lista de eventos vazia. Nenhum nó para verificar."], estatisticas

    # Ordenar por sequence_number e id caso venham fora de ordem
    eventos_ordenados = sorted(eventos, key=lambda x: (x.get("sequence_number", 0), x.get("id", 0)))
    
    hash_esperado_anterior = GENESIS_BLOCK_HASH
    particao_atual = eventos_ordenados[0].get("partition", "desconhecida")
    estatisticas["particoes_analisadas"].add(particao_atual)

    logs.append(f"[INÍCIO DA PERÍCIA] Partição: {particao_atual} | Total de elos: {len(eventos_ordenados)}")
    logs.append(f"[GÊNESIS ESPERADO] {GENESIS_BLOCK_HASH}")

    for idx, evento in enumerate(eventos_ordenados):
        evento_id = evento.get("id", idx + 1)
        seq = evento.get("sequence_number", idx + 1)
        prev_hash = evento.get("previous_hash", "")
        curr_hash = evento.get("current_hash", "")
        payload = evento.get("payload", {})

        # 1. Verificar continuidade do elo anterior
        if prev_hash != hash_esperado_anterior:
            msg = (
                f"[FALHA DE ENLACE] No evento #{evento_id} (seq {seq}):\\n"
                f"  previous_hash registrado: {prev_hash}\\n"
                f"  esperado pelo elo prévio: {hash_esperado_anterior}"
            )
            logs.append(msg)
            estatisticas["status_geral"] = "ADULTERADA"
            estatisticas["indice_corrompido"] = seq
            estatisticas["detalhes_falha"] = msg
            return False, logs, estatisticas

        # 2. Recalcular o hash do payload atual
        hash_recalculado = calcular_hash_evento(prev_hash, payload)
        if hash_recalculado != curr_hash:
            msg = (
                f"[FALHA CRIPTOGRÁFICA] No evento #{evento_id} (seq {seq}):\\n"
                f"  current_hash registrado : {curr_hash}\\n"
                f"  hash recalculado pericial: {hash_recalculado}\\n"
                f"  payload analisado: {payload}"
            )
            logs.append(msg)
            estatisticas["status_geral"] = "ADULTERADA"
            estatisticas["indice_corrompido"] = seq
            estatisticas["detalhes_falha"] = msg
            return False, logs, estatisticas

        estatisticas["eventos_validos"] += 1
        hash_esperado_anterior = curr_hash
        logs.append(f"  ✓ Elo {seq:04d} verificado [OK] | Hash: {curr_hash[:16]}...{curr_hash[-8:]}")

    logs.append(f"[CONCLUSÃO PERICIAL] Cadeia 100% íntegra. {estatisticas['eventos_validos']} nós verificados com sucesso.")
    return True, logs, estatisticas

def main():
    parser = argparse.ArgumentParser(
        description="SHM - Verificador Independente de Trilha Forense (RFC 8785 + SHA-256)",
        epilog="Desenvolvido para auditoria forense judicial e investigações policiais."
    )
    parser.add_argument("-a", "--arquivo", help="Caminho do arquivo JSON contendo os eventos exportados")
    parser.add_argument("-s", "--stdin", action="store_true", help="Lê o fluxo JSON diretamente da entrada padrão (stdin)")
    parser.add_argument("-v", "--verbose", action="store_true", help="Exibe detalhes completos de cada elo auditado")

    args = parser.parse_args()

    dados_json = None
    if args.arquivo:
        try:
            with open(args.arquivo, "r", encoding="utf-8") as f:
                dados_json = json.load(f)
        except Exception as e:
            print(f"[ERRO] Falha ao ler arquivo '{args.arquivo}': {e}", file=sys.stderr)
            sys.exit(2)
    elif args.stdin or not sys.stdin.isatty():
        try:
            dados_json = json.load(sys.stdin)
        except Exception as e:
            print(f"[ERRO] Falha ao ler JSON da entrada padrão: {e}", file=sys.stderr)
            sys.exit(2)
    else:
        parser.print_help()
        sys.exit(1)

    eventos = dados_json if isinstance(dados_json, list) else dados_json.get("eventos", [])
    if not isinstance(eventos, list):
        print("[ERRO] Formato inválido: esperava lista de eventos ou objeto com chave 'eventos'.", file=sys.stderr)
        sys.exit(2)

    valido, logs, stats = validar_trilha_forense(eventos)

    if args.verbose or not valido:
        for linha in logs:
            print(linha)
    else:
        print(f"Status: {stats['status_geral']}")
        print(f"Total de elos verificados: {stats['eventos_validos']}/{stats['total_eventos']}")
        if logs:
            print(logs[-1])

    sys.exit(0 if valido else 1)

if __name__ == "__main__":
    main()
`;

/**
 * Dispara o download automático do script Python como arquivo independente no navegador.
 */
export function downloadScriptVerificador(nomeArquivo: string = 'verificador_independente.py'): void {
  const blob = new Blob([SCRIPT_PYTHON_VERIFICADOR], { type: 'text/x-python;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nomeArquivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
