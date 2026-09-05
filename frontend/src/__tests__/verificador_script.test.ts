import { SCRIPT_PYTHON_VERIFICADOR, downloadScriptVerificador } from '../utils/verificador_script'

/**
 * Validação de integridade do script Python autocontido distribuído para perícias.
 * Executada como asserção estrita durante testes de unidade e verificação de build.
 */
export function assertVerificadorScriptValido(): boolean {
  if (typeof SCRIPT_PYTHON_VERIFICADOR !== 'string') {
    throw new Error('SCRIPT_PYTHON_VERIFICADOR deve ser uma string.')
  }
  if (!SCRIPT_PYTHON_VERIFICADOR.startsWith('#!/usr/bin/env python3')) {
    throw new Error('Script Python deve iniciar com shebang #!/usr/bin/env python3.')
  }
  if (!SCRIPT_PYTHON_VERIFICADOR.includes('GENESIS_BLOCK_HASH = "0" * 64')) {
    throw new Error('Script deve definir o bloco gênese com 64 zeros.')
  }
  if (!SCRIPT_PYTHON_VERIFICADOR.includes('def canonicalize_rfc8785')) {
    throw new Error('Script deve conter a função canonicalize_rfc8785.')
  }
  if (!SCRIPT_PYTHON_VERIFICADOR.includes('def calcular_hash_evento')) {
    throw new Error('Script deve conter a função calcular_hash_evento.')
  }
  if (!SCRIPT_PYTHON_VERIFICADOR.includes('def validar_trilha_forense')) {
    throw new Error('Script deve conter a função validar_trilha_forense.')
  }
  if (typeof downloadScriptVerificador !== 'function') {
    throw new Error('downloadScriptVerificador deve ser uma função.')
  }
  return true
}

// Execução imediata da asserção
assertVerificadorScriptValido()
