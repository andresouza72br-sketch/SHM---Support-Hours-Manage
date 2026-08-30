---
schema_version: 1
id: OPP-20260829-k2ml
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
  before: "MagicLinkCicloView acoplada a validações temporais, marcação de uso e dispatch de ações"
  after: "CicloMagicLinkService isolando a orquestração de Magic Links com garantias atômicas"
change_set:
  - chg: CHG-001
    file: backend/apps/ciclos/services.py
    purpose: Adiciona classe CicloMagicLinkService com resolver_magic_link, obter_dados_visualizacao e processar_acao
  - chg: CHG-002
    file: backend/apps/ciclos/views.py
    purpose: Simplifica MagicLinkCicloView delegando para CicloMagicLinkService
approval:
  by: user
  at: "2026-08-29T00:54:02-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação desacoplou o gerenciamento de Magic Links de ciclos da camada de apresentação HTTP, transferindo a resolução retrocompatível de tokens, verificação de expiração, execução atômica e marcação de uso único para a classe de serviço `CicloMagicLinkService`.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Validação da suíte com 73 testes verdes.
2. **Criação da Classe de Serviço:** Implementação de `CicloMagicLinkService` em `apps/ciclos/services.py`.
3. **Refatoração da View:** Simplificação dos métodos `get` e `post` em `MagicLinkCicloView` em `apps/ciclos/views.py`.
4. **Verificação da Rede de Segurança:** Execução completa dos 73 testes com 100% de sucesso.
