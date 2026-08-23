# 05 - Workflows e Máquinas de Estado

Este documento define os fluxos operacionais completos e as transições de estado para Pedidos, Ciclos e Contratos.

---

## 1. Workflow de Pedido (Solicitação)

```mermaid
stateDiagram-v2
    [*] --> ABERTO: Cliente ou Empresa cria Pedido
    ABERTO --> EM_ANALISE: Gestor de Suporte inicia análise
    EM_ANALISE --> AGUARDANDO_APROVACAO: Empresa decompõe em Ciclos e orça
    AGUARDANDO_APROVACAO --> EM_EXECUCAO: Pelo menos 1 Ciclo aprovado pelo Cliente
    EM_EXECUCAO --> CONCLUIDO: Todos os Ciclos receberam Aceite Final
    CONCLUIDO --> ENCERRADO: Arquivamento / Relatório emitido
    ABERTO --> CANCELADO: Cancelado por solicitante/admin
    EM_ANALISE --> CANCELADO: Cancelado
    AGUARDANDO_APROVACAO --> CANCELADO: Todos os ciclos rejeitados
```

---

## 2. Workflow do Ciclo de Execução

```mermaid
stateDiagram-v2
    [*] --> CRIADO: Gestor de Suporte cria contexto
    CRIADO --> ORCADO: Tarefas e horas estimadas definidas
    ORCADO --> AGUARDANDO_APROVACAO: Enviado ao Cliente para avaliação
    AGUARDANDO_APROVACAO --> APROVADO: Gestor do Cliente aprova
    AGUARDANDO_APROVACAO --> REJEITADO: Gestor do Cliente rejeita (com motivo)
    REJEITADO --> ORCADO: Empresa readequa escopo/horas
    APROVADO --> EM_EXECUCAO: Técnico inicia tarefas
    EM_EXECUCAO --> AGUARDANDO_ACEITE: Técnico conclui todas as tarefas
    AGUARDANDO_ACEITE --> ACEITO: Gestor do Cliente confirma aceite (deduz saldo)
    AGUARDANDO_ACEITE --> EM_EXECUCAO: Gestor do Cliente solicita correções
    ACEITO --> ENCERRADO: Ciclo finalizado e registrado
```

---

## 3. Workflow de Contrato, Rollover e Saldo Negativo

```mermaid
stateDiagram-v2
    [*] --> RASCUNHO: Admin cadastra contrato
    RASCUNHO --> ATIVO: Contrato entra em vigência
    ATIVO --> ATIVO: Ciclos aceitos deduzem saldo (permite saldo negativo)
    ATIVO --> VENCIDO: Data fim da vigência atingida
    
    state VENCIDO {
        [*] --> JANELA_ROLLOVER_30_DIAS: Aguardando novo contrato
        JANELA_ROLLOVER_30_DIAS --> SALDO_TRANSFERIDO: Vinculado a novo contrato (SaldoTransferido)
        JANELA_ROLLOVER_30_DIAS --> PRORROGADO_MANUAL: Admin estende data limite
        PRORROGADO_MANUAL --> SALDO_TRANSFERIDO: Vinculado a novo contrato
        JANELA_ROLLOVER_30_DIAS --> LIQUIDACAO_COBRANCA: 30 dias expirados ou Admin encerra
    }
    
    SALDO_TRANSFERIDO --> ENCERRADO: Histórico preservado
    LIQUIDACAO_COBRANCA --> ENCERRADO: Enviado para faturamento
```

---

## 4. Matriz de Transições e Guardas de Estado

### Ciclo
| Estado Origem | Evento / Ação | Ator Autorizado | Condição / Guarda | Estado Destino |
| :--- | :--- | :--- | :--- | :--- |
| `CRIADO` | Concluir Estimativas | Gestor Suporte / Admin | Pelo menos 1 tarefa com horas estimadas > 0 | `ORCADO` |
| `ORCADO` | Enviar p/ Aprovação | Gestor Suporte / Admin | Nenhuma | `AGUARDANDO_APROVACAO` |
| `AGUARDANDO_APROVACAO` | Aprovar Orçamento | Gestor Cliente | Nenhuma | `APROVADO` |
| `AGUARDANDO_APROVACAO` | Rejeitar Orçamento | Gestor Cliente | Motivo de rejeição obrigatório | `REJEITADO` |
| `APROVADO` | Iniciar Execução | Técnico / Gestor Suporte | Nenhuma | `EM_EXECUCAO` |
| `EM_EXECUCAO` | Concluir Tarefas | Técnico / Gestor Suporte | Todas as tarefas com flag `concluida=True` e horas lançadas | `AGUARDANDO_ACEITE` |
| `AGUARDANDO_ACEITE` | Registrar Aceite Final | Gestor Cliente | Nenhuma (Dispara dedução de horas do Contrato) | `ACEITO` |
| `ACEITO` | Encerrar Ciclo | Sistema / Admin | Nenhuma | `ENCERRADO` |
