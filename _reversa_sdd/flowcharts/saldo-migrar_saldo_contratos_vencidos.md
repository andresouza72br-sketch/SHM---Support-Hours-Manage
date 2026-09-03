# Fluxograma — Saldo: `migrar_saldo_contratos_vencidos`

```mermaid
flowchart TD
    Start([Início: Solicitação de Migração de Saldo]) --> ValidaIds{Origem == Destino?}
    ValidaIds -- Sim --> ErroIgual[Erro: Contratos não podem ser iguais]
    ValidaIds -- Não --> LockOrdenado[Adquirir Lock Pessimista select_for_update ordenado por ID]
    
    LockOrdenado --> ValidaCliente{Mesmo Cliente?}
    ValidaCliente -- Não --> ErroCliente[Erro: Permitido apenas entre contratos do mesmo cliente]
    ValidaCliente -- Sim --> ValidaSaldo{Saldo Origem > 0?}
    
    ValidaSaldo -- Não --> ErroSaldo[Erro: Contrato de origem sem saldo positivo]
    ValidaSaldo -- Sim --> DefineQtd{Qtd especificada > 0?}
    
    DefineQtd -- Sim --> ConfereQtd{Qtd <= Saldo Origem?}
    DefineQtd -- Não --> UsaTotal[Qtd = Saldo Total da Origem]
    
    ConfereQtd -- Não --> ErroQtd[Erro: Qtd solicitada superior ao disponível]
    ConfereQtd -- Sim --> ExecutaTransf[Executar Transferência Contábil Atômica]
    UsaTotal --> ExecutaTransf
    
    ExecutaTransf --> PersisteTransf[Cria registro TransferenciaSaldo]
    PersisteTransf --> DebitaOrigem[Origem: saldo -= Qtd]
    DebitaOrigem --> CreditaDestino[Destino: saldo += Qtd]
    CreditaDestino --> LedgerOrigem[HistoricoSaldo: TRANSFERENCIA_ENVIO (-Qtd)]
    LedgerOrigem --> LedgerDestino[HistoricoSaldo: TRANSFERENCIA_RECEBIMENTO (+Qtd)]
    
    LedgerDestino --> AuditContrato[ContratoAuditLog: Registra auditoria em ambos contratos]
    AuditContrato --> DisparaEmails[Notifica gestores e interessados por e-mail]
    DisparaEmails --> RetornoOk([Retorna dados da transferência e saldos atualizados])
```
