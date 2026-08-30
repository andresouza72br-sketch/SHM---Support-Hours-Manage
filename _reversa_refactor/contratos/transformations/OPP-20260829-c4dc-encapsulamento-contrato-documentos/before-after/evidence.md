# Evidência de Desacoplamento e Arquitetura - OPP-20260829-c4dc

> Contexto: `contratos`  
> Verbo: `decouple`  
> Método de Preservação: `tests` (Equivalência estrita de contrato de API e respostas forenses)

---

## 1. Métricas de Acoplamento e Separação de Camadas

| Dimensão | Antes | Depois | Ganho |
|---|---|---|---|
| **Lógica de Storage & Hashing na View** | 120 linhas dispersas em 3 actions | 0 (delegado para `ContratoDocumentoService`) | **View Estritamente Serializadora** |
| **Garantia Transacional na Adição / Remoção** | Inexistente / Parcial | `@transaction.atomic` | **Consistência Total** |
| **Reusabilidade de Verificação de Integridade** | Acoplada à requisição HTTP | Reutilizável em crons e auditorias contábeis | **100% Reusável** |
| **Auditoria Forense de Exclusão** | Inline na View | Centralizada no serviço com captura de IP e UA | **Garantia Forense Isolada** |

---

## 2. Equivalência Funcional

1. **Upload:** Limite de 5 documentos, verificação de tamanho máximo de 25MB, cálculo de SHA-256 e gravação de log forense mantidos.
2. **Exclusão:** Verificação de justificativa com tamanho mínimo de 5 caracteres, deleção física de arquivo no storage e auditoria forense preservadas.
3. **Integridade:** Retornos de integridade física vs hash criptográfico idênticos com códigos HTTP 200, 404 e 500.
