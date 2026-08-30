# Evidência de Equivalência e Arquitetura - OPP-20260829-c1ac

> Contexto: `contratos`  
> Verbo: `restructure`  
> Método de Preservação: `tests` (Equivalência de saída e garantias transacionais)

---

## 1. Métricas de Arquitetura e Atomicidade

| Dimensão | Antes | Depois | Ganho |
|---|---|---|---|
| **Lógica de Aceite na View HTTP** | 89 linhas inline em `AceiteContratoView.post` | 17 linhas (delegação limpa) | **-80% Complexidade na View** |
| **Garantia Transacional** | Não-atômico (risco de ativação parcial) | `@transaction.atomic` no serviço | **100% Consistência Transacional** |
| **Testabilidade do Aceite** | Apenas via HTTP Request/APIClient | Testável unitariamente via `ContratoService.formalizar_aceite` | **Testabilidade Direta** |
| **Códigos de Resposta HTTP** | 200, 404, 409, 410 | 200, 404, 409, 410 | **100% Equivalência de API** |

---

## 2. Equivalência Funcional

1. **Validação de Token e Idempotência:** Links inexistentes continuam retornando `404`, links já utilizados continuam retornando `409` com data formatada, e links expirados retornam `410`.
2. **Ativação e Auditoria:** O contrato tem status alterado para `StatusContrato.ATIVO`, e o registro forense é persistido com autor, IP e user-agent.
3. **Notificações:** O envio de e-mails e criação de notificações in-app para gerentes e administradores continua idêntico.
