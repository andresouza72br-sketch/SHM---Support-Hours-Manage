# Evidência de Equivalência e Redução Estrutural

**Oportunidade:** `OPP-20260829-ac1g`  
**Método de Preservação:** `tests`

### Antes vs Depois

#### 1. Linhas de Código e Complexidade Ciclomática
* **Antes (`GoogleAuthView.post`):**
  * ~105 linhas de código contendo validação, parse de mock de dev, Google OAuth SDK, tratamento de exceções, checagem B2B, mutação de perfil e geração de JWT.
* **Depois:**
  * `GoogleAuthView.post` reduzida para 15 linhas limpas delegando para `AuthService.autenticar_google`.
  * Regras de negócio encapsuladas em serviço testável independentemente.

### Preservação de Comportamento
1. Todos os 7 testes específicos de Google OAuth em `backend/tests/test_google_auth.py` passaram sem nenhuma modificação nos testes.
2. Tratamento de token simulado de dev (`dev_simulated_token:`) 100% preservado.
3. Tratamento de erros HTTP 400 (token expirado/inválido), 403 (e-mail não autorizado / usuário inativo) e 200 (sucesso) 100% preservados.
