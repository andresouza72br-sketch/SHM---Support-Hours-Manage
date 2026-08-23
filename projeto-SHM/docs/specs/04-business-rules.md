# 04 - Regras de Negócio (Business Rules)

Este documento cataloga de forma inequívoca todas as regras de negócio aplicáveis ao SHM.

---

## 1. Contratos, Saldos e Rollover

- **RN-CON-001 (Cálculo do Saldo do Contrato)**:
  $$\text{Saldo Atual} = (\text{Horas Contratadas} + \text{Horas Herdadas}) - \text{Horas Consumidas}$$
- **RN-CON-002 (Consumo por Horas Realizadas)**:
  O saldo do contrato é deduzido **apenas e exclusivamente quando um ciclo recebe o Aceite Final do Cliente**, sendo o valor deduzido igual à soma das **horas realizadas** das tarefas daquele ciclo.
- **RN-CON-003 (Suporte a Saldo Negativo)**:
  O sistema **permite saldo negativo**. Se a dedução de um ciclo levar o saldo para um valor menor que zero ($< 0$), a operação é concluída normalmente, com notificação e destaque visual no dashboard.
- **RN-CON-004 (Destino do Saldo Negativo)**:
  Um saldo negativo pode:
  1. Ser transferido como herança negativa para um novo contrato do mesmo cliente (reduzindo o saldo inicial do novo contrato); OU
  2. Ser encerrado pelo Administrador da Empresa para faturamento avulso / cobrança de horas excedentes.
- **RN-CON-005 (Janela Padrão de Rollover)**:
  Saldos remanescentes (positivos) ou saldos negativos de um contrato expirado/vencido têm um período de **30 dias corridos** para serem transferidos para um novo contrato.
- **RN-CON-006 (Flexibilidade e Prorrogação de Rollover)**:
  O Administrador da Empresa pode estender manualmente a data limite de rollover de um contrato específico (`prorrogacao_rollover_ate`) ou finalizar o contrato e encaminhar as horas para cobrança.
- **RN-CON-007 (Auditabilidade de Transferência de Saldo)**:
  Toda transferência de saldo entre contratos deve gerar um registro imutável em `SaldoTransferido`, contendo contrato de origem, contrato de destino, quantidade de horas, usuário executor, justificativa e timestamp.

---

## 2. Pedidos, Ciclos e Tarefas

- **RN-PED-001 (Abertura de Pedido)**:
  Pedidos podem ser abertos por qualquer usuário do Cliente ou por operadores da Empresa Prestadora (Admin ou Gestor de Suporte).
- **RN-PED-002 (Decomposição em Ciclos)**:
  Um Pedido pode ser decomposto em $1$ a $N$ Ciclos independentes. A análise e criação dos ciclos é realizada pela Empresa Prestadora.
- **RN-PED-003 (Orçamento de Horas)**:
  Cada Ciclo deve conter suas tarefas planejadas com a estimativa de horas. A soma das horas estimadas das tarefas compõe o orçamento total do ciclo (`horas_estimadas_total`).
- **RN-CIC-001 (Aprovação Prévia do Orçamento)**:
  Nenhum ciclo pode entrar em status `EM_EXECUCAO` sem que o `GESTOR_CLIENTE` tenha aprovado formalmente o orçamento (status `APROVADO`).
- **RN-CIC-002 (Alterações durante a Execução)**:
  Assim que o ciclo entra em `EM_EXECUCAO`, somente operadores da Empresa Prestadora (Técnicos, Gestor de Suporte, Admin) podem criar tarefas, alterar horas estimadas ou lançar horas realizadas.
- **RN-CIC-003 (Exclusividade do Aceite Final)**:
  Somente o perfil `GESTOR_CLIENTE` pode registrar o **Aceite Final** do ciclo. O aceite consolida as horas realizadas e dispara a atualização do saldo do contrato.
- **RN-CIC-004 (Variação de Horas Realizadas vs. Estimadas)**:
  Se as horas realizadas divergirem das horas estimadas, o sistema registra a justificativa técnica na timeline. O valor deduzido é sempre o realizado.

---

## 3. Matriz de Perfis e Permissões (RBAC)

| Ação no Sistema | Admin Empresa | Gestor Suporte | Técnico | Gestor Cliente | Usuário Cliente |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Cadastrar / Editar Clientes e Contratos | ✅ | ❌ | ❌ | ❌ | ❌ |
| Realizar / Prorrogar Rollover de Saldo | ✅ | ❌ | ❌ | ❌ | ❌ |
| Abrir Pedido de Suporte | ✅ | ✅ | ❌ | ✅ | ✅ |
| Decompor Pedido em Ciclos / Orçar | ✅ | ✅ | ❌ | ❌ | ❌ |
| Aprovar Orçamento de Ciclo | ❌ | ❌ | ❌ | ✅ | ❌ |
| Lançar Horas Realizadas em Tarefas | ✅ | ✅ | ✅ | ❌ | ❌ |
| Solicitar Aceite Final ao Cliente | ✅ | ✅ | ✅ | ❌ | ❌ |
| Registrar Aceite Final (Deduz Saldo) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Inserir Comentários / Dúvidas na Timeline | ✅ | ✅ | ✅ | ✅ | ✅ |
| Visualizar Dashboard Financeiro de Horas | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## 4. Timeline e Auditoria

- **RN-AUD-001 (Registro Cronológico Automático)**:
  Toda mudança de status de pedido/ciclo, aprovação de orçamento, lançamento/ajuste de horas e aceite final deve gerar automaticamente uma entrada em `ComentarioTimeline` com tipo de evento correspondente e timestamp.
- **RN-AUD-002 (Imutabilidade da Timeline)**:
  Entradas de timeline do tipo evento de sistema (`MUDANCA_STATUS`, `APROVACAO`, `ACEITE`, `AJUSTE_HORAS`) não podem ser editadas ou excluídas por nenhum usuário.
