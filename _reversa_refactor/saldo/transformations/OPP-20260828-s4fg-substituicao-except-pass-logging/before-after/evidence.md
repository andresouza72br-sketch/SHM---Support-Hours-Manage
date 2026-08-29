# Evidência de Equivalência e Observabilidade - OPP-20260828-s4fg

> Contexto: `saldo`  
> Verbo: `simplify`  
> Método de Preservação: `equivalence-proof`

---

## 1. Métricas de Observabilidade

| Dimensão | Antes | Depois | Ganho Comprovado |
|---|---|---|---|
| **Tratamento de Exceções Silenciosas** | 4 blocos `except Exception: pass` | 0 blocos silenciosos | **100% Observabilidade** |
| **Rastreio de Falhas de E-mail / SMTP** | Nulo (falhas invisíveis) | `logger.warning(..., exc_info=True)` | **Logs Estruturados com Stacktrace** |
| **Rastreio de Falhas de Notificação In-App** | Nulo (falhas invisíveis) | `logger.warning(..., exc_info=True)` | **Logs Estruturados com Stacktrace** |
| **Resiliência da Transação Financeira** | Preservada | Preservada | **Sem Regressão Contábil** |

---

## 2. Prova de Equivalência Funcional

1. **Garantia de Não-Interrupção:** O fluxo principal de migração e compensação continua executando sem interrupções caso o envio de e-mail ou a inserção de notificações in-app falhe.
2. **Diagnóstico em Produção:** Engenheiros de suporte e Sentry recebem o traceback completo de qualquer erro externo.
