# Domínio e Regras de Negócio — SHM 2.4

> Gerado pelo **Reversa Detective** em 2026-08-27
> Escala de Confiança: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA

---

## 1. Glossário Ubíquo do Domínio

| Termo | Definição no Sistema | Confiança |
|---|---|---|
| **Cliente / Tomador** | Organização jurídica (PJ) ou pessoa física (PF) contratante dos serviços de suporte. | 🟢 CONFIRMADO |
| **Contrato** | Instrumento formal (`CT-YYYY-NNNN`) que estabelece franquia de horas, vigência, carência de 30 dias e saldo. | 🟢 CONFIRMADO |
| **Carência** | Período de 30 dias após `data_termino` em que o saldo remanescente ainda pode ser consumido em atendimentos de suporte. | 🟢 CONFIRMADO |
| **Saldo Remanescente** | Saldo positivo de um contrato expirado, utilizável exclusivamente durante o período de carência. | 🟢 CONFIRMADO |
| **Pedido de Suporte** | Protocolo unificado (`OSYYYYMMNNNN`) que agrega a demanda aberta pelo cliente. Não consome horas diretamente. | 🟢 CONFIRMADO |
| **Ciclo de Atendimento** | Unidade atômica e decomposta de trabalho técnico (`Corretiva`, `Evolutiva`, `Preventiva`, `Análise`, etc.). | 🟢 CONFIRMADO |
| **Orçamento de Horas** | Estimativa técnica inicial lançada pelo técnico para autorização do cliente. **Não debita saldo**. | 🟢 CONFIRMADO |
| **Aceite Formal** | Assinatura/validação final pelo cliente tomador. **Momento exclusivo em que ocorre o débito de saldo pelas horas reais**. | 🟢 CONFIRMADO |
| **Tarefa** | Apontamento granular de esforço técnico realizado dentro de um ciclo. | 🟢 CONFIRMADO |
| **Ledger de Saldo** | Histórico imutável e append-only (`HistoricoSaldo`) de todas as transações de débito, crédito e transferências. | 🟢 CONFIRMADO |
| **Magic Link** | Token seguro UUIDv4 de uso único com expiração de 7 dias para aprovações públicas sem autenticação. | 🟢 CONFIRMADO |
| **Avaliação de Ciclo** | Nota de satisfação de 1 a 5 estrelas e comentário pós-aceite formal. | 🟢 CONFIRMADO |

---

## 2. Regras de Negócio Fundamentais (Business Rules)

### RN-01: Hierarquia e Vínculos Estruturais 🟢
1. Todo Contrato pertence obrigatoriamente a um Cliente.
2. Todo Pedido pertence obrigatoriamente a um Cliente e a um Contrato ativo ou em carência.
3. Todo Ciclo pertence obrigatoriamente a um Pedido.
4. Toda Tarefa pertence obrigatoriamente a um Ciclo.

### RN-02: Débito de Saldo Exclusivamente no Aceite 🟢
- A aprovação de orçamento pelo cliente **não afeta** o saldo de horas do contrato (`saldo` permanece inalterado).
- O débito no contrato ocorre **apenas quando o cliente concede o Aceite Formal do Ciclo**.
- A quantidade debitada é estritamente igual ao somatório das horas reais das tarefas realizadas (`ciclo.horas_realizadas`).

### RN-03: Vigência Contratual e Regra de Carência 🟢
- Contratos com `data_termino < hoje` passam a status `expirado`.
- Se `hoje <= data_fim_carencia` (geralmente data_termino + 30 dias), `em_carencia = True`.
- Enquanto em carência e com saldo positivo, o saldo remanescente pode ser consumido em chamados de suporte.
- Após o término da carência, nenhum novo chamado pode ser vinculado e o contrato é bloqueado.

### RN-04: Ledger Imutável e Integridade ACID 🟢
- O saldo do contrato nunca é alterado por update direto sem criar um registro correspondente em `shm_historico_saldo`.
- Toda movimentação financeira de horas registra: `tipo_operacao`, `quantidade`, `saldo_resultante`, `autor`, `ip_origem`, `user_agent` e timestamp.
- Transações utilizam `select_for_update()` para garantir consistência sob concorrência.

### RN-05: Transferência de Saldo entre Contratos 🟢
- Transferências de horas são permitidas **exclusivamente entre contratos pertencentes ao mesmo cliente**.
- O contrato de origem deve possuir saldo igual ou superior à quantidade transferida.
- A operação cria dois lançamentos no ledger: `transferencia_envio` (débito na origem) e `transferencia_recebimento` (crédito no destino).

### RN-06: Integridade Documental SHA-256 🟢
- Todo arquivo anexado a um contrato gera um hash SHA-256 calculado no momento do upload.
- A API disponibiliza endpoint de auditoria que recalcula o hash do arquivo em disco e valida a correspondência exata.