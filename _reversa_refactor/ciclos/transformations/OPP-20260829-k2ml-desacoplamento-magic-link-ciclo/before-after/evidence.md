# Evidência de Desacoplamento e Arquitetura - OPP-20260829-k2ml

> Contexto: `ciclos`  
> Verbo: `decouple`  
> Método de Preservação: `tests` (Equivalência funcional estrita de Magic Links)

---

## 1. Métricas de Complexidade e Separação de Camadas

| Dimensão | Antes | Depois | Ganho |
|---|---|---|---|
| **Lógica de Magic Link na View** | 140 linhas em `MagicLinkCicloView` | 28 linhas (delegação limpa) | **-80% Complexidade na View** |
| **Garantia de Uso Único (Single-Use)** | Manipulação manual inline | `@transaction.atomic` em `CicloMagicLinkService` | **100% Consistência Forense** |
| **Testabilidade do Dispatch** | Apenas via APIClient HTTP | Testável unitariamente via chamada de serviço | **Testabilidade Direta** |

---

## 2. Equivalência Funcional

1. **Ações Suportadas:** `aprovar`, `aceitar` e `avaliar` preservam comportamentos, cálculos de saldo e mensagens de sucesso.
2. **Restrições de Segurança:** Ações `recusar`/`rejeitar` continuam retornando HTTP 403. Links expirados retornam HTTP 410 e links consumidos retornam HTTP 409.
3. **Resolução Retrocompatível:** Tokens UUIDv4 e legados continuam sendo resolvidos transparentemente.
