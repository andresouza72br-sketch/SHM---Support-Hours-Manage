# Evidência de Desacoplamento - OPP-20260829-cm1d

## 1. Medição do Acoplamento Eferente (Ce)

| Componente | Antes | Depois | Redução |
|---|---|---|---|
| `ComentarioViewSet` (HTTP) | 7 dependências de domínio e infra | 1 dependência de serviço (`ComentarioService`) | **-85%** |
| Camada de Serviço | Inexistente (lógica na View) | `ComentarioService` encapsulado | **Separação de Camadas** |

## 2. Preservação de Comportamento

- Compatibilidade total com a API REST DRF.
- 7/7 testes automatizados verdes.
