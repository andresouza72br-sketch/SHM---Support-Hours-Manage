# Evidência de Equivalência Semântica e Algorítmica

**Oportunidade:** `OPP-20260829-ac3s`  
**Método de Preservação:** `equivalence-proof`

### Antes vs Depois

#### `backend/apps/accounts/views.py` (`PasswordlessVerifyView.post`)
* **Antes:**
  ```python
  if timezone.now() > token_obj.expira_em:
      return Response(
          {"detail": "Este link de login expirou (validade de 15 minutos). Solicite um novo link."},
          status=status.HTTP_410_GONE,
      )
  ```
* **Depois:**
  ```python
  if token_obj.esta_expirado():
      return Response(
          {"detail": "Este link de login expirou (validade de 15 minutos). Solicite um novo link."},
          status=status.HTTP_410_GONE,
      )
  ```

### Casos de Teste Validados

1. Token emitido e consumido imediatamente (válido): `esta_expirado() == False`, status `200 OK`.
2. Token com tempo expirado: `esta_expirado() == True`, status `410 Gone`.
3. Idempotência de token já consumido: checagem de `token_obj.usado` preservada com status `409 Conflict`.
