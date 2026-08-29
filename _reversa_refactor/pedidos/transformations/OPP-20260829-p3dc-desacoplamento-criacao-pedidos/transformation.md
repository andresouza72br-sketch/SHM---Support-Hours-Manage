---
schema_version: 1
id: OPP-20260829-p3dc
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
  before: "Lógica de criação de pedidos e resolução de cliente acoplada ao hook perform_create da View"
  after: "PedidoService.criar_pedido e PedidoService.resolver_cliente_para_pedido encapsulando a operação de domínio"
change_set:
  - chg: CHG-001
    file: backend/apps/pedidos/services.py
    purpose: Adiciona resolver_cliente_para_pedido e criar_pedido com suporte transacional atômico
  - chg: CHG-002
    file: backend/apps/pedidos/views.py
    purpose: Simplifica perform_create delegando diretamente para PedidoService.criar_pedido
approval:
  by: user
  at: "2026-08-29T01:35:34-03:00"
reversible_via:
  - CHG-001.diff
---

### Resumo da Transformação

A transformação desacoplou o processo de criação de chamados de suporte da camada de apresentação HTTP, centralizando a resolução de cliente, geração de protocolo e despacho de eventos no método transacional `PedidoService.criar_pedido`.

### Etapas Executadas:

1. **Baseline e Rede de Segurança:** Validação da suíte com 73 testes verdes.
2. **Criação do Método no Serviço:** Implementação de `PedidoService.criar_pedido` e `PedidoService.resolver_cliente_para_pedido` em `apps/pedidos/services.py`.
3. **Refatoração da View:** Atualização de `PedidoViewSet.perform_create` em `apps/pedidos/views.py`.
4. **Verificação da Rede de Segurança:** Execução completa dos 73 testes com 100% de sucesso.
