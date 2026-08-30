# Evidencia Before/After - OPP-20260829-nt4p

> Transformacao: Padronizacao de Logging e Imports PEP 8  
> Contexto: `notificacoes`  
> Metodo de Preservacao: `pattern-only`

---

## 1. Antes

- `print()` direto no stdout para eventos transacionais de e-mail.
- Tratamento de exceções silencioso (`pass`) na gravação de eventos da timeline.
- Imports de `settings`, `EmailMultiAlternatives` e `Notification` declarados dentro do corpo dos métodos.

## 2. Depois

- Instância de logger de módulo: `logger = logging.getLogger(__name__)`.
- Registro com `logger.info` para envio bem-sucedido e `logger.error(..., exc_info=True)` para falhas.
- `logger.warning` em falhas ao registrar `TimelineEvent` para evitar perda silenciosa de auditoria.
- Imports consolidados no cabeçalho conforme as diretrizes PEP 8.
