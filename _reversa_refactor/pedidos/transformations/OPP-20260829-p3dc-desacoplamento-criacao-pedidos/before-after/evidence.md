# Evidência de Desacoplamento e Arquitetura - OPP-20260829-p3dc

> Contexto: `pedidos`  
> Verbo: `decouple`  
> Método de Preservação: `tests` (Equivalência funcional estrita na criação de chamados)

---

## 1. Métricas de Complexidade e Separação de Camadas

| Dimensão | Antes | Depois | Ganho |
|---|---|---|---|
| **Lógica de Criação na View** | Inline no hook `perform_create` | Delegada para `PedidoService.criar_pedido` | **View 100% Desacoplada** |
| **Garantia Transacional** | Parcial (dependente do DRF) | `@transaction.atomic` no serviço | **100% Atomicidade de Domínio** |
| **Testabilidade Direta** | Acoplada ao cliente de teste HTTP | Testável via chamadas normais do Python | **Testabilidade Unitária** |

---

## 2. Equivalência Funcional

1. Resolução automática do cliente para usuários do tipo cliente ou vinculação a partir do contrato para usuários da empresa.
2. Geração atômica de protocolo sequencial `OSYYYYMMNNNN`.
3. Disparo do evento de notificação `notificar_novo_pedido` preservado.
