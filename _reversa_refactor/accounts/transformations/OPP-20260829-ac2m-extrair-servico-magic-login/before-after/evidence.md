# Evidência de Equivalência e Redução Estrutural

**Oportunidade:** `OPP-20260829-ac2m`  
**Método de Preservação:** `tests`

### Antes vs Depois

#### 1. `PasswordlessRequestView` e `PasswordlessVerifyView`
* **Antes:**
  * Lógica de consulta de usuário, cálculo de expiração de 15 minutos, verificação de concorrência, auditoria forense com gravação de IP e User-Agent, e despacho de JWT executados diretamente no corpo das Views.
* **Depois:**
  * Views reduzidas para chamadas diretas a `AuthService.solicitar_magic_login` e `AuthService.verificar_magic_login`.
  * Separação estrita entre a camada de protocolo HTTP e a camada de serviços de domínio.

### Preservação de Comportamento
1. Emissão de links de login sem senha testada e validada.
2. Expiração de 15 minutos preservada.
3. Auditoria forense (gravação do IP e User-Agent) 100% preservada.
4. Suíte com 31 testes aprovados com 100% de sucesso.
