---
schema_version: 1
id: OPP-20260829-c4dc
verb: decouple
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
  before: "ContratoViewSet acoplada a operações físicas de storage, cálculo manual de hash SHA-256 e logs forenses"
  after: "ContratoDocumentoService isolando o ciclo de vida completo de anexos com garantias atômicas"
change_set:
  - chg: CHG-001
    file: backend/apps/contratos/services.py
    purpose: Adiciona classe ContratoDocumentoService com adicionar_documento, excluir_documento e verificar_integridade
  - chg: CHG-002
    file: backend/apps/contratos/views.py
    purpose: Refatora upload_documento, deletar_documento e verificar_documento para delegar a ContratoDocumentoService
approval:
  by: user
  at: "2026-08-29T00:36:48-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação desacoplou o gerenciamento de anexos da `ContratoViewSet`, transferindo o ciclo de vida físico de arquivos em storage, cálculo de hash SHA-256 e gravação de logs forenses para a classe de serviço `ContratoDocumentoService`.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Validação da suíte com 73 testes verdes.
2. **Criação da Classe de Serviço:** Implementação de `ContratoDocumentoService` em `apps/contratos/services.py`.
3. **Refatoração da View:** Desacoplamento das actions `upload_documento`, `deletar_documento` e `verificar_documento` em `apps/contratos/views.py`.
4. **Verificação da Rede de Segurança:** Execução completa dos 73 testes com 100% de sucesso.
