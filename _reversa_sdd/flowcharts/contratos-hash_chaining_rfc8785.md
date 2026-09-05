# Fluxograma de Função: Encadeamento de Hashes (RFC 8785 & SHA-256)

> Módulo: `contratos`  
> Serviço: `ForensicAuditService.registrar_evento()`  
> Padrões: RFC 8785 (JSON Canonicalization Scheme) + FIPS 180-4 (SHA-256) + CPP Arts. 158-A a F  

```mermaid
flowchart TD
    Start([Início: Evento Transacional Relevante]) --> Lock[Obter Lock Pessimista na Partição de Auditoria]
    Lock --> Seq[Incrementar sequence_number = last_sequence + 1]
    Seq --> Canon[Canonicalizar Payload via RFC 8785 / JCS]
    Canon --> HashPayload[Calcular payload_hash = SHA-256 de payload_canonico]
    HashPayload --> GetPrev[Recuperar previous_hash do Registro Anterior]
    GetPrev --> CheckGenesis{É o Primeiro Registro da Partição?}
    CheckGenesis -- Sim --> GenesisHash[previous_hash = 64 zeros 'GENESIS']
    CheckGenesis -- Não --> UsePrev[previous_hash = ultimo_registro.current_hash]
    GenesisHash --> CalcCurr
    UsePrev --> CalcCurr[Calcular current_hash = SHA-256 de sequence + timestamp + evento + prev_hash + payload_hash]
    CalcCurr --> Insert[INSERT no ForensicAuditLog]
    Insert --> TriggerCheck{Trigger PostgreSQL: UPDATE ou DELETE?}
    TriggerCheck -- Sim --> Exception[RAISE EXCEPTION 'Imutabilidade Estrita: Operação Proibida']
    TriggerCheck -- Não --> Commit[COMMIT Transacional]
    Commit --> End([Fim: Registro Indelével Carimbado])
```
