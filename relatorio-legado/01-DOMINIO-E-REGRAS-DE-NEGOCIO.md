# 01. Domínio e Regras de Negócio — SHM (Support Hours Manager)

Este documento extrai e formaliza todas as regras de negócio, comportamentos de domínio, restrições e fluxos de trabalho identificados nas iterações de brainstorm, nas 16 especificações (specs/001 a specs/016) e no código do sistema legado.

---

## 1. Visão do Produto e Problema Central

### 1.1 O Problema
Empresas prestadoras de serviços de software e suporte técnico enfrentam gargalos crônicos na gestão de contratos de horas:
- Clientes abrem solicitações por canais dispersos (e-mail, WhatsApp, reuniões).
- Horas e atividades são controladas em planilhas manuais ou sistemas desconexos.
- Não há transparência no consumo das horas, gerando desconfiança, contestações de faturamento e atrito na renovação de contratos.
- Chamados frequentemente misturam manutenções corretivas, melhorias evolutivas e dúvidas operacionais, inviabilizando um orçamento único coerente.

### 1.2 A Solução SHM
O **SHM** é uma plataforma SaaS B2B focada em **auditoria, governança e transparência do consumo de horas técnicas em contratos de suporte**.

O diferencial central é a decomposição de qualquer solicitação em **Ciclos de Atendimento**, onde cada ciclo possui seu próprio orçamento, execução, tarefas e aceite formal do cliente, com dedução automática e auditável do saldo contratual.

---

## 2. Atores do Sistema e Matriz de Permissões (RBAC)

O sistema opera com 4 papéis essenciais distribuídos em dois lados da relação comercial:

### 2.1 Prestador de Serviços (A Empresa)
1. **Gerente da Empresa (Admin / Superadmin)**:
   - Cadastra e edita Clientes (PF/PJ).
   - Cadastra e gerencia Contratos e Aditivos (vigência, horas contratadas, valor mensal, uploads de PDFs).
   - Realiza transferências de saldo entre contratos do mesmo cliente, reabastecimentos manuais e estornos.
   - Visualiza dashboards executivos de todos os clientes e contratos.
   - Gerencia operadores/técnicos e configurações do sistema.

2. **Analista / Técnico / Operador da Empresa**:
   - Analisa pedidos abertos por clientes.
   - Decompõe pedidos em **Ciclos** e emite orçamentos (horas estimadas).
   - Executa tarefas, aponta horas reais gastas e anexa evidências.
   - Solicita aceite formal ao cliente ao concluir um ciclo.
   - Registra comentários temporais e interage com o cliente.
   - *Restrição:* Não altera regras de contrato nem transfere saldos entre contratos.

### 2.2 Tomador de Serviços (O Cliente)
3. **Gerente do Cliente (Tomador Principal)**:
   - Acessa o Portal do Cliente (Dashboard Kanban com visão de saldo e vigência).
   - Abre novos pedidos com múltiplos anexos.
   - **Aprova ou Rejeita orçamentos de ciclos** (com justificativa em caso de recusa).
   - **Concede o Aceite Final ou Recusa o encerramento do ciclo** (o que efetiva o débito de horas do contrato).
   - Visualiza extratos detalhados de consumo e faz download de PDFs contratuais.
   - Comenta em ciclos e tarefas.

4. **Analista do Cliente (Usuário Operacional)**:
   - Acessa o Portal do Cliente e visualiza o Kanban de pedidos.
   - Abre novos pedidos e comenta em ciclos existentes.
   - Acompanha o saldo remanescente do contrato.
   - *Restrições:* **Não aprova orçamentos**, **não dá aceite final** e **não visualiza anexos confidenciais dos contratos** (PDFs/valores).

---

## 3. A Hierarquia Fundamental do Domínio

`mermaid
graph TD
    Cliente["🏢 Cliente (PF ou PJ)"] --> Contrato["📄 Contrato de Suporte (Horas & Vigência)"]
    Contrato --> Aditivo["📑 Aditivos / Contratos de Referência"]
    Contrato --> Pedido["🎫 Pedido de Suporte (Protocolo OS...)"]
    Pedido --> Ciclo1["🔄 Ciclo 1: Corretiva (Orçamento & Aceite)"]
    Pedido --> Ciclo2["🔄 Ciclo 2: Treinamento (Orçamento & Aceite)"]
    Ciclo1 --> Tarefa1["📌 Tarefa Prevista / Realizada (Horas Reais)"]
    Ciclo1 --> Tarefa2["📌 Tarefa Prevista / Realizada (Horas Reais)"]
    Ciclo1 --> Comentario["💬 Comentários Temporais & Anexos"]
    Ciclo1 --> Aceite["✅ Aceite do Cliente -> Débito de Saldo"]
`

### 3.1 Cliente
- Pode ser **Pessoa Jurídica (PJ)** com CNPJ e Razão Social ou **Pessoa Física (PF)** com CPF e Nome Completo.
- Centraliza dados de contato, endereço e status (Ativo/Inativo).
- Possui múltiplos usuários vinculados (Gerentes e Analistas).

### 3.2 Contrato
- Representa o acordo de prestação de serviços com um volume de **horas contratadas** dentro de uma **vigência** (Data Início e Data Término).
- Controla o **Saldo Disponível** e as **Horas Consumidas**.
- Tipos de Contrato:
  - **Novo**: Contrato autônomo inicial.
  - **Aditivo**: Vinculado a um contrato de referência (herda contexto e pode consolidar saldos).
- Suporta até 3 PDFs anexados (Contrato assinado, Proposta Técnica, Termos Aditivos).
- **Link de Aceite do Contrato**: Token único (UUID) com expiração de 30 dias para aceite eletrônico pelo cliente.

### 3.3 Pedido de Suporte
- É o "chamado" inicial. Um pedido é aberto pelo cliente (ou pela empresa em nome do cliente) contendo assunto, descrição livre, nível de prioridade (Baixa, Média, Alta, Urgente) e anexos.
- Gera automaticamente um protocolo sequencial no padrão OS{Ano}{Mês}{Sequencial:04d} (ex.: OS2026080001).
- O pedido funciona como **agrupador macro** e seu status reflete o estado consolidado dos seus ciclos.

### 3.4 Ciclo de Atendimento (O Coração do Sistema)
Como os clientes frequentemente misturam necessidades em uma única solicitação, o prestador decompõe o Pedido em um ou mais **Ciclos**:
- **Tipos de Ciclo**:
  - Corretiva (Correção de bugs ou falhas)
  - Evolutiva (Novas funcionalidades ou melhorias)
  - Preventiva (Revisões, manutenções rotineiras, backups)
  - Análise (Investigação técnica, diagnóstico de viabilidade)
  - Consultoria (Orientação estratégica ou arquitetural)
  - Treinamento (Capacitação de usuários do cliente)
- Cada ciclo possui:
  - Contexto explicativo específico.
  - Operador responsável.
  - Horas estimadas (orçamento).
  - Horas realizadas (soma das tarefas executadas).
  - Datas e timestamps de cada etapa (apresentado, aprovado, aceito).
  - Token de acesso público para aprovação/aceite via **Magic Link**.

### 3.5 Tarefas
- Subdivisões operacionais dentro de um ciclo.
- **Tarefas Previstas**: Criadas no momento da elaboração do orçamento para justificar as horas estimadas.
- **Tarefas Realizadas**: Criadas ou atualizadas durante a execução real. Podem diferir das previstas (tarefas podem ser adicionadas, removidas ou ter suas horas ajustadas conforme a complexidade real).
- Cada tarefa registra horas_estimadas e horas_realizadas.

---

## 4. Ciclo de Vida e Máquinas de Estados

### 4.1 Ciclo de Vida do Ciclo de Atendimento

`mermaid
stateDiagram-v2
    [*] --> ORCADO: Criado pela Empresa
    ORCADO --> AGUARDANDO_APROVACAO: Apresentar Orçamento (Horas Estimadas)
    AGUARDANDO_APROVACAO --> ORCADO: Rejeitado pelo Cliente (com Justificativa)
    AGUARDANDO_APROVACAO --> APROVADO: Aprovado pelo Cliente
    APROVADO --> EM_EXECUCAO: Iniciar Execução (Técnico)
    EM_EXECUCAO --> AGUARDANDO_ACEITE: Solicitar Aceite (Técnico finalizou tarefas)
    AGUARDANDO_ACEITE --> EM_EXECUCAO: Recusado pelo Cliente (com Justificativa)
    AGUARDANDO_ACEITE --> ACEITO: Aceito pelo Cliente (Débito de Saldo!)
    ORCADO --> CANCELADO: Cancelado
    AGUARDANDO_APROVACAO --> CANCELADO: Cancelado
    APROVADO --> CANCELADO: Cancelado
    EM_EXECUCAO --> CANCELADO: Cancelado
    ACEITO --> [*]
    CANCELADO --> [*]
`

### 4.2 Sincronização do Status do Pedido a partir dos Ciclos
O status do Pedido é derivado automaticamente do estado agregado de seus Ciclos:
1. Se não houver ciclos: **Aberto** (berto).
2. Se existir ao menos 1 ciclo em guardando_aprovacao: Pedido fica **Aguardando Aprovação** (guardando_aprovacao).
3. Se existir ao menos 1 ciclo em guardando_aceite: Pedido fica **Aguardando Aceite** (guardando_aceite).
4. Se existir ao menos 1 ciclo em m_execucao ou provado: Pedido fica **Em Execução** (m_execucao).
5. Se existir ao menos 1 ciclo em orcado: Pedido fica **Em Orçamento** (m_orcamento).
6. Se **todos** os ciclos estiverem ceito ou cancelado: Pedido é finalizado como **Concluído** (concluido).

---

## 5. Regras Financeiras e Gestão de Saldo de Horas

### 5.1 Regra Fundamental do Consumo
- **O saldo do contrato NUNCA é debitado no momento do orçamento nem na aprovação inicial**.
- O consumo ocorre **exclusivamente no momento do Aceite Final do Ciclo** pelo cliente.
- A quantidade debitada corresponde às **horas_realizadas** acumuladas no ciclo, refletindo o esforço técnico real entregue.

### 5.2 Regra de Carência de 30 Dias e Saldo Remanescente
- Quando um contrato atinge sua data_termino, seu status passa para xpirado.
- Ao expirar, ativa-se automaticamente um período de **Carência de 30 dias** (data_fim_carencia = data_termino + 30 dias).
- **Durante a carência**:
  - Se o contrato possuía **saldo positivo (remanescente)**, esse saldo pode continuar sendo consumido por pedidos abertos durante a vigência ou transferido/migrado integralmente como crédito para a renovação (novo contrato ou aditivo).
  - Se o contrato possuía **saldo negativo (devedor)**, o débito é consolidado para faturamento adicional ou deduzido do saldo inicial do novo contrato.
- **Após a carência**:
  - Se o cliente não renovar, o saldo remanescente expira definitivamente.

### 5.3 Transferência de Saldo entre Contratos
- Permite que o Gestor da Empresa transfira horas de um contrato com saldo ocioso para outro contrato com saldo escasso do **mesmo cliente**.
- Regras:
  - Ambos os contratos devem pertencer ao mesmo Cliente.
  - Ambos os contratos devem estar tivos.
  - O contrato de origem deve possuir saldo igual ou superior à quantidade a ser transferida.
  - A operação gera dois lançamentos auditáveis no histórico: 	ransferencia_envio (-) e 	ransferencia_recebimento (+).

### 5.4 Reabastecimento e Estorno
- **Reabastecimento**: Injeção avulsa de horas em um contrato ativo mediante aprovação comercial, com justificativa obrigatória e registro imutável no histórico.
- **Estorno**: Operações de saldo são imutáveis (nunca sofrem UPDATE ou DELETE destrutivo). Qualquer correção deve ser feita através de um registro compensatório de storno, referenciando o operacao_original_id.

---

## 6. Comunicação, Colaboração e Notificações

### 6.1 Comentários Temporais
- Operadores e clientes podem registrar comentários assíncronos ao longo de todo o ciclo de vida.
- Comentários podem ser vinculados a um **Ciclo** ou diretamente a uma **Tarefa**.
- Suporte a anexo de arquivos de até 10MB (PDF, PNG, JPG, ZIP).
- **Rastreamento de Leitura**: Controle por usuário (lido_em), permitindo badge visual de comentários não lidos.
- **Conversão de Comentário em Tarefa**: Se uma dúvida ou solicitação do cliente em um comentário demandar esforço técnico não previsto, o operador pode converter o comentário em uma nova Tarefa com estimativa de horas, mantendo a rastreabilidade.

### 6.2 Magic Links (Aprovação sem Login)
- Clientes (especialmente diretores e gerentes) precisam aprovar orçamentos e emitir aceites com agilidade sem atrito de autenticação.
- O sistema gera tokens UUID criptográficos únicos por ciclo/orçamento.
- O e-mail de notificação inclui um link direto (ex.: https://shm.app/publico/ciclo/550e8400-e29b-41d4-a716-446655440000).
- Ao acessar, o cliente visualiza o resumo técnico, horas orçadas/realizadas e botões diretos de **Aprovar**, **Rejeitar**, **Aceitar** ou **Recusar**, solicitando apenas um campo de justificativa em caso de rejeição.

### 6.3 Timeline de Auditoria Imutável
- Toda ação de relevância gera um TimelineEvent:
  - pedido_criado, ciclo_criado, ciclo_orcado, ciclo_aprovado, ciclo_rejeitado, ciclo_em_execucao, ciclo_aceito, ciclo_recusado, ciclo_cancelado, 	arefa_criada, 	arefa_editada, comentario_adicionado.
- Registra autor, timestamp, descrição legível e payload JSON de metadados para auditoria completa.