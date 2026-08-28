# Dicionário Completo de Dados — SHM 2.4

> Gerado pelo **Reversa Archaeologist** em 2026-08-27  
> Base de Dados: SQLite / PostgreSQL

---

## 1. Tabela `shm_user` (Módulo Accounts)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `username` | VarChar(150) | Não | - | Nome de usuário único no sistema |
| `email` | VarChar(254) | Não | - | Endereço de e-mail institucional / contato |
| `role` | VarChar(20) | Não | CLIENTE_GERENTE | EMPRESA_ADMIN, EMPRESA_TECNICO, CLIENTE_GERENTE, CLIENTE_ANALISTA |
| `telefone` | VarChar(20) | Sim | NULL | Telefone de contato do usuário |
| `avatar_url` | VarChar(500) | Sim | NULL | URL da foto de perfil / Google Avatar |
| `cliente_id` | BigInt (FK) | Sim | NULL | FK para `shm_cliente` (obrigatório para clientes) |

## 2. Tabela `shm_cliente` (Módulo Clientes)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `tipo` | VarChar(2) | Não | PJ | Tipo de tomador: PF (Pessoa Física) ou PJ (Pessoa Jurídica) |
| `razao_social` | VarChar(200) | Sim | NULL | Razão social (obrigatório se PJ) |
| `nome_fantasia` | VarChar(200) | Sim | NULL | Nome fantasia da organização |
| `cnpj` | VarChar(18) | Sim | NULL | CNPJ formatado ou limpo (validado matematicamente) |
| `nome_completo` | VarChar(200) | Sim | NULL | Nome civil completo (obrigatório se PF) |
| `cpf` | VarChar(14) | Sim | NULL | CPF formatado ou limpo (validado matematicamente) |
| `email_contato` | VarChar(254) | Não | - | E-mail principal do tomador |
| `status` | VarChar(25) | Não | pendente_aprovacao | pendente_aprovacao, ativo, suspenso, inativo |
| `email_verificado` | Boolean | Não | False | Flag de confirmação de e-mail |
| `aprovado_em` | DateTime | Sim | NULL | Data/hora do aceite cadastral via Magic Link |
| `aprovado_ip` | GenericIP | Sim | NULL | Endereço IP do dispositivo que aprovou |

## 3. Tabela `shm_contrato` (Módulo Contratos)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `numero` | VarChar(30) | Não | - | Código único CT-YYYY-NNNN |
| `tipo` | VarChar(15) | Não | novo | novo, aditivo, renovacao |
| `contrato_referencia_id` | BigInt (FK) | Sim | NULL | FK recursiva para contrato pai (em aditivos) |
| `cliente_id` | BigInt (FK) | Não | - | FK para `shm_cliente` |
| `data_inicio` | Date | Não | - | Início da vigência |
| `data_termino` | Date | Sim | NULL | Término da vigência |
| `data_fim_carencia` | Date | Sim | NULL | Fim da carência de 30 dias para consumo de saldo |
| `horas_contratadas` | Decimal(10,2) | Não | - | Franquia total de horas contratadas |
| `saldo` | Decimal(10,2) | Não | 0.00 | Saldo disponível de horas |
| `horas_consumidas` | Decimal(10,2) | Não | 0.00 | Total acumulado de horas consumidas |
| `status` | VarChar(20) | Não | pendente_aceite | pendente_aceite, ativo, concluido, cancelado, suspenso, expirado |

## 4. Tabela `shm_pedido` (Módulo Pedidos)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `protocolo` | VarChar(20) | Não | - | Protocolo único sequencial OSYYYYMMNNNN |
| `cliente_id` | BigInt (FK) | Não | - | FK para `shm_cliente` |
| `contrato_id` | BigInt (FK) | Não | - | FK para `shm_contrato` |
| `assunto` | VarChar(200) | Não | - | Título resumido da demanda |
| `descricao` | TextField | Não | - | Descrição completa do chamado |
| `prioridade` | VarChar(10) | Não | media | baixa, media, alta, urgente |
| `status` | VarChar(25) | Não | aberto | aberto, em_orcamento, aguardando_aprovacao, em_execucao, aguardando_aceite, concluido, cancelado |

## 5. Tabela `shm_ciclo` (Módulo Ciclos)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `pedido_id` | BigInt (FK) | Não | - | FK para `shm_pedido` |
| `tipo` | VarChar(20) | Não | analise | corretiva, evolutiva, preventiva, analise, consultoria, treinamento, teste |
| `contexto` | TextField | Sim | NULL | Escopo e detalhes técnicos do ciclo |
| `operador_id` | BigInt (FK) | Não | - | FK para `shm_user` (técnico responsável) |
| `status` | VarChar(25) | Não | orcado | orcado, aguardando_aprovacao, aprovado, em_execucao, aguardando_aceite, aceito, cancelado |
| `horas_estimadas` | Decimal(8,2) | Não | 0.00 | Horas orçadas para o cliente |
| `horas_realizadas` | Decimal(8,2) | Não | 0.00 | Horas reais apontadas nas tarefas |
| `token_acesso` | UUID | Não | uuid4 | Token Magic Link para aprovação/aceite público |
| `aceito_em` | DateTime | Sim | NULL | Carimbo temporal do aceite formal |

## 6. Tabela `shm_tarefa` (Módulo Tarefas)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `ciclo_id` | BigInt (FK) | Não | - | FK para `shm_ciclo` |
| `descricao` | TextField | Não | - | Descrição do serviço técnico executado |
| `horas_estimadas` | Decimal(8,2) | Não | 0.00 | Estimativa técnica da tarefa |
| `horas_realizadas` | Decimal(8,2) | Não | 0.00 | Esforço real despendido pelo técnico |
| `status` | VarChar(15) | Não | prevista | prevista, realizada, cancelada |

## 7. Tabela `shm_historico_saldo` (Módulo Saldo / Ledger Imutável)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | UUID | Não | uuid4 | Chave Primária PK (UUIDv4) |
| `contrato_id` | BigInt (FK) | Não | - | FK para `shm_contrato` |
| `tipo_operacao` | VarChar(30) | Não | - | consumo, transferencia_envio, transferencia_recebimento, reabastecimento, estorno |
| `quantidade` | Decimal(8,2) | Não | - | Horas debitadas (-) ou creditadas (+) |
| `saldo_resultante` | Decimal(10,2) | Não | - | Snapshot do saldo após a operação |
| `ciclo_id` | BigInt (FK) | Sim | NULL | FK para ciclo que gerou o consumo |
| `ip_origem` | GenericIP | Sim | NULL | IP de origem para compliance e auditoria |

## 8. Tabela `shm_avaliacao_ciclo` (Módulo Ciclos / Avaliação)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `ciclo_id` | BigInt (FK/1:1)| Não | - | OneToOne para `shm_ciclo` |
| `avaliador_id` | BigInt (FK) | Não | - | FK para `shm_user` (gerente que avaliou) |
| `nota` | SmallInt | Não | - | Nota de 1 a 5 estrelas |
| `comentario` | TextField | Sim | " | Feedback qualitativo do cliente |
