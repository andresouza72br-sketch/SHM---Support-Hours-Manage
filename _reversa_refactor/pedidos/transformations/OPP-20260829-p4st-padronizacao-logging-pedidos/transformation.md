---
schema_version: 1
id: OPP-20260829-p4st
verb: standardize
state: applied
safety_net:
  kind: existing
  green_before: true
  green_after: true
preservation:
  method: tests
  evidence:
    - safety-net/test-report.md
    - before-after/evidence.md
measurement:
  before: "except Exception: pass silenciando erros no envio de notificação de novo chamado"
  after: "logger.warning(..., exc_info=True) garantindo rastreabilidade de falhas"
change_set:
  - chg: CHG-001
    file: backend/apps/pedidos/services.py
    purpose: Adiciona logger e padroniza captura de exceções em PedidoService.criar_pedido
approval:
  by: user
  at: "2026-08-29T01:42:16-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação padronizou a observabilidade operacional na criação de pedidos em `PedidoService.criar_pedido`, substituindo o bloco silencioso `pass` por logging estruturado com stack trace completo.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Validação da suíte com 73 testes verdes.
2. **Adição do Logger:** Configuração de `logger = logging.getLogger(__name__)` em `apps/pedidos/services.py`.
3. **Padronização da Captura:** Substituição de `except Exception: pass` por `logger.warning(..., exc_info=True)`.
4. **Verificação da Rede de Segurança:** Execução completa dos 73 testes com 100% de sucesso.
