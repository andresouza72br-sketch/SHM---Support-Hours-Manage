# 02 - Glossário de Domínio

Este documento estabelece o vocabulário oficial e as definições estritas para todos os conceitos utilizados no sistema SHM.

| Termo | Definição no Sistema |
| :--- | :--- |
| **Empresa Prestadora** | Organização que comercializa contratos de suporte técnico e executa as horas técnicas. |
| **Cliente** | Empresa contratante dos serviços de suporte técnico que possui um ou mais contratos e usuários no sistema. |
| **Contrato** | Instrumento que define o pacote de horas contratadas, período de vigência, saldo disponível e histórico de consumo. |
| **Horas Contratadas** | Quantidade base de horas contratadas na vigência original do contrato (ex: 100 horas). |
| **Horas Herdadas** | Saldo (positivo ou negativo) transferido de um contrato anterior encerrado para o contrato atual. |
| **Horas Consumidas** | Total acumulado de horas realizadas provenientes de ciclos que receberam aceite formal do cliente. |
| **Saldo de Horas** | Horas disponíveis calculadas pela fórmula: $\text{Saldo} = (\text{Horas Contratadas} + \text{Horas Herdadas}) - \text{Horas Consumidas}$. Pode ser negativo. |
| **Saldo Negativo** | Situação em que as horas consumidas ultrapassam o total contratado + herdado. O sistema não bloqueia a operação, sinalizando pendência para faturamento ou dedução em contrato futuro. |
| **Pedido (Solicitação)** | Registro inicial de uma necessidade ou chamado enviado pelo cliente ou criado internamente pela empresa. Pode ser amplo e conter múltiplos contextos. |
| **Ciclo de Execução** | Unidade de orçamento, aprovação, execução e aceite gerada a partir de um Pedido. Possui tipo específico (ex: *Corretiva*, *Evolutiva*, *Consultoria/Treinamento*, *Análise*). |
| **Tarefa** | Menor unidade de trabalho dentro de um Ciclo. Possui descrição, horas estimadas e horas realizadas lançadas pelo técnico. |
| **Horas Estimadas** | Previsão de horas orçadas pela empresa para uma tarefa ou ciclo antes da execução. |
| **Horas Realizadas** | Horas efetivamente gastas e apontadas pelo técnico na execução da tarefa. É o valor real que será deduzido do contrato após o aceite. |
| **Orçamento** | Proposta enviada pela empresa contendo os ciclos e tarefas decompostos a partir de um pedido, com suas respectivas horas estimadas. |
| **Aprovação do Orçamento** | Ação do Gestor do Cliente que autoriza o início da execução do ciclo com base na estimativa de horas. |
| **Aceite Final** | Confirmação formal e irrevogável realizada pelo Gestor do Cliente ao término de um ciclo, validando a entrega e disparando a dedução do saldo de horas. |
| **Timeline / Comentários** | Histórico cronológico e imutável de interações, dúvidas, mudanças de status e registros técnicos vinculados a um pedido ou ciclo. |
| **Rollover / Transferência de Saldo** | Processo de transferir o saldo final (positivo ou negativo) de um contrato vencido para um novo contrato, com prazo padrão de 30 dias. |
| **Expiração de Saldo** | Condição em que o saldo remanescente de um contrato encerrado não foi transferido dentro do prazo (30 dias padrão), exigindo prorrogação manual pelo Admin ou liquidação/cobrança. |
