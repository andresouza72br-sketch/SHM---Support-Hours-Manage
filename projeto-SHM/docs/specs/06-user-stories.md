# 06 - Histórias de Usuário (User Stories)

Este documento descreve os fluxos funcionais sob a perspectiva de cada persona do sistema.

---

## 1. Persona: Gestor do Cliente

- **US-CLI-01 (Visualização de Saldo e Consumo)**:
  - *Como* Gestor do Cliente,
  - *Quero* acessar um dashboard em tempo real exibindo horas contratadas, horas herdadas, horas consumidas e saldo atual (mesmo que negativo),
  - *Para* acompanhar com precisão o consumo do meu contrato de suporte.
- **US-CLI-02 (Aprovação de Orçamento de Ciclo)**:
  - *Como* Gestor do Cliente,
  - *Quero* revisar os ciclos e tarefas decompostos a partir de uma solicitação com suas horas estimadas e aprovar ou rejeitar o orçamento,
  - *Para* autorizar o início dos trabalhos técnicos com clareza de custos.
- **US-CLI-03 (Aceite Final de Ciclo)**:
  - *Como* Gestor do Cliente,
  - *Quero* revisar as tarefas concluídas e as horas efetivamente realizadas pela equipe técnica e emitir o aceite formal,
  - *Para* validar a entrega do serviço e permitir a dedução no saldo de horas do contrato.

---

## 2. Persona: Usuário do Cliente

- **US-USR-01 (Abertura de Solicitação)**:
  - *Como* Usuário do Cliente,
  - *Quero* registrar um pedido de suporte detalhando problemas ou necessidades do sistema,
  - *Para* que a equipe prestadora analise e orce o atendimento.
- **US-USR-02 (Interação via Timeline)**:
  - *Como* Usuário do Cliente,
  - *Quero* adicionar comentários, dúvidas e esclarecimentos na timeline do pedido/ciclo,
  - *Para* colaborar ativamente com a equipe de suporte durante a resolução.

---

## 3. Persona: Técnico (Empresa Prestadora)

- **US-TEC-01 (Visualização de Tarefas Atribuídas)**:
  - *Como* Técnico,
  - *Quero* visualizar minha lista de tarefas em ciclos aprovados em execução,
  - *Para* saber exatamente quais atividades técnicas devo executar.
- **US-TEC-02 (Apontamento de Horas Realizadas)**:
  - *Como* Técnico,
  - *Quero* registrar as horas efetivamente trabalhadas em cada tarefa e marcar o item como concluído,
  - *Para* contabilizar o esforço real do ciclo com precisão.
- **US-TEC-03 (Solicitação de Aceite)**:
  - *Como* Técnico,
  - *Quero* submeter o ciclo para "Aguardando Aceite" após a finalização de todas as tarefas,
  - *Para* que o Gestor do Cliente valide a entrega.

---

## 4. Persona: Gestor de Suporte (Empresa Prestadora)

- **US-SUP-01 (Análise e Decomposição de Pedidos)**:
  - *Como* Gestor de Suporte,
  - *Quero* analisar pedidos recebidos e dividi-los em múltiplos ciclos categorizados (Corretiva, Evolutiva, Treinamento, etc.),
  - *Para* organizar o escopo em entregas orçáveis e gerenciáveis.
- **US-SUP-02 (Estimativa de Horas por Tarefa)**:
  - *Como* Gestor de Suporte,
  - *Quero* cadastrar tarefas planejadas com horas estimadas e enviar o orçamento ao cliente,
  - *Para* obter a aprovação formal do cliente antes de alocar a equipe técnica.

---

## 5. Persona: Administrador (Empresa Prestadora)

- **US-ADM-01 (Gestão de Contratos e Clientes)**:
  - *Como* Administrador,
  - *Quero* cadastrar clientes, vigências de contrato e pacotes de horas contratadas,
  - *Para* manter a base contratual estruturada.
- **US-ADM-02 (Rollover e Transferência de Saldos)**:
  - *Como* Administrador,
  - *Quero* transferir saldos remanescentes ou saldos negativos de contratos vencidos para novos contratos (dentro da janela de 30 dias ou com prorrogação manual),
  - *Para* garantir a continuidade do relacionamento comercial sem perdas financeiras.
- **US-ADM-03 (Encerramento e Faturamento de Horas Excedentes)**:
  - *Como* Administrador,
  - *Quero* encerrar contratos com saldo negativo expirados e gerar relatório de horas excedentes,
  - *Para* encaminhar a cobrança avulsa ao departamento financeiro.
