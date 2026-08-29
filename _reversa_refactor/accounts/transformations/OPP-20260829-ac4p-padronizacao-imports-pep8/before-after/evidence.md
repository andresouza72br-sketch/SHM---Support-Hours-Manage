# Evidência de Equivalência Semântica e Estrutural

**Oportunidade:** `OPP-20260829-ac4p`  
**Método de Preservação:** `pattern-only`

### Antes vs Depois

#### 1. `backend/apps/accounts/models.py`
* **Antes:**
  * Linha 51 continha `import uuid` no corpo da classe `PasswordlessLoginToken`.
  * Linha 69 continha `from django.utils import timezone` dentro de `esta_expirado()`.
* **Depois:**
  * Imports de `uuid` e `timezone` centralizados no topo do arquivo.
  * Estrutura de classes limpa e padronizada.

#### 2. `backend/apps/accounts/views.py`
* **Antes:**
  * `PasswordlessRequestView.post` e `PasswordlessVerifyView.post` continham imports repetidos de `timedelta`, `timezone`, `PasswordlessLoginToken`, `get_client_ip` e `get_client_user_agent`.
  * Valor de 15 minutos em `timedelta(minutes=15)` sem constante nomeada.
* **Depois:**
  * Imports centralizados no topo.
  * Constante `MAGIC_LOGIN_EXPIRATION_MINUTES = 15` declarada.
  * Assinaturas e corpos de métodos reduzidos e limpos.
