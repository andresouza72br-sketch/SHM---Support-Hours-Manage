# Evidencias da Transformacao - OPP-20260829-cl5v

> Contexto: `clientes`  
> Oportunidade: `OPP-20260829-cl5v`  
> Data: 2026-08-29

---

## 1. Validacao e Padronizacao

Validadores matemáticos de CNPJ e CPF padronizados e centralizados em `models.py` e validados via `ClienteSerializer.validate()`, mantendo integridade com as fixtures e fluxos do framework Django REST.

```python
# apps/clientes/models.py
def validar_cnpj(cnpj: str) -> bool:
    cnpj_limpo = re.sub(r"\D", "", cnpj or "")
    if len(cnpj_limpo) != 14 or cnpj_limpo == cnpj_limpo[0] * 14:
        return False
    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma1 = sum(int(cnpj_limpo[i]) * pesos1[i] for i in range(12))
    resto1 = soma1 % 11
    d1 = 0 if resto1 < 2 else 11 - resto1
    if int(cnpj_limpo[12]) != d1:
        return False
    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma2 = sum(int(cnpj_limpo[i]) * pesos2[i] for i in range(13))
    resto2 = soma2 % 11
    d2 = 0 if resto2 < 2 else 11 - resto2
    return int(cnpj_limpo[13]) == d2
```

---

## 2. Ganhos Estruturais

- **Consistência Semântica:** Reutilização uniforme dos validadores matemáticos no fluxo de cadastro da API pública e privada.
- **Segurança de Regressão Global:** Suíte global de 73 testes executada com 100% de sucesso.
