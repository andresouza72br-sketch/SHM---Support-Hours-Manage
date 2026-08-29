# Evidência de Simplificação e Isolamento de Regras - OPP-20260829-k3tl

> Contexto: `ciclos`  
> Verbo: `simplify`  
> Método de Preservação: `equivalence-proof` (Equivalência da política de tolerância de +30%)

---

## 1. Métricas de Simplificação

| Dimensão | Antes | Depois | Ganho |
|---|---|---|---|
| **Lógica Aninhada em `aceitar_ciclo`** | 15 linhas com condicionais e exceptions | 5 linhas (chamada direta ao validador) | **-66% Complexidade Ciclomática** |
| **Isolamento da Regra RF-CIC-05** | Acoplada a modelos e banco de dados | Método puro `validar_tolerancia_horas` | **100% Testável Unitariamente** |
| **Reusabilidade de Validação** | Impossível fora de `aceitar_ciclo` | Invocável em previews de tela e relatórios | **100% Reusável** |

---

## 2. Equivalência Funcional

1. **Horas Realizadas <= Tolerância:** Aceite concedido normalmente com débito de saldo.
2. **Horas Realizadas > Tolerância com Justificativa:** Aceite de exceção permitido e auditado no log forense.
3. **Horas Realizadas > Tolerância sem Justificativa:** `ValidationError` com mensagem e cálculo idênticos.
