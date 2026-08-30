---
schema_version: 1
id: OPP-20260828-s4fg
verb: simplify
state: applied
safety_net:
  kind: existing
  green_before: true
  green_after: true
preservation:
  method: equivalence-proof
  evidence:
    - safety-net/test-report.md
    - before-after/evidence.md
measurement:
  before: "4 blocos except Exception: pass silenciosos ocultando falhas de e-mail e notificações"
  after: "Logging estruturado logger.warning com exc_info=True para todos os efeitos colaterais"
change_set:
  - chg: CHG-001
    file: backend/apps/saldo/services.py
    purpose: Adiciona logger e substitui blocos de silenciamento mudo por logging estruturado com traceback
approval:
  by: user
  at: "2026-08-28T23:47:09-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação simplificou o tratamento de falhas em integrações externas (e-mails e notificações in-app), substituindo silenciamentos genéricos por logging estruturado com stacktrace.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Validação de 73 testes verdes.
2. **Integração do Logging:** Configuração de `logger = logging.getLogger(__name__)` em `apps/saldo/services.py`.
3. **Substituição dos Silenciamentos:**
   - Em `SaldoService.migrar_saldo_contratos_vencidos` (e-mail e notificações)
   - Em `SaldoService.compensar_debito_contrato_anterior` (e-mail e notificações)
4. **Verificação da Rede de Segurança:** Execução completa dos 73 testes com 100% de sucesso.
