# Dicionário Completo de Dados — SHM 2.5.0

> Gerado pelo **Reversa Archaeologist** em 2026-09-03  
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

---

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

---

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

---

## 4. Tabela `shm_contrato_documento` (Módulo Contratos)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `contrato_id` | BigInt (FK) | Não | - | FK para `shm_contrato` |
| `arquivo` | FileField | Não | - | Caminho relativo do documento em disco |
| `nome_original` | VarChar(255) | Não | - | Nome original do arquivo submetido |
| `tipo_documento` | VarChar(30) | Não | outro | proposta, contrato_assinado, aditivo, distrato, outro |
| `tamanho_bytes` | BigInt | Não | 0 | Tamanho do arquivo em bytes |
| `hash_sha256` | VarChar(64) | Não | "" | Hash SHA-256 criptográfico para prova de integridade |
| `algoritmo_hash` | VarChar(20) | Não | SHA-256 | Algoritmo criptográfico utilizado |
| `enviado_por_id` | BigInt (FK) | Sim | NULL | FK para `shm_user` |

---

## 5. Tabela `shm_contrato_email_notificacao` (Módulo Contratos)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `contrato_id` | BigInt (FK) | Não | - | FK para `shm_contrato` |
| `email` | EmailField | Não | - | Endereço de e-mail do destinatário |
| `nome` | VarChar(150) | Sim | NULL | Nome ou cargo do destinatário |
| `ativo` | Boolean | Não | True | Notificações habilitadas para este e-mail |
| `status` | VarChar(20) | Não | pendente | pendente, confirmado, recusado, expirado |
| `token` | UUIDField | Não | uuid4 | Token seguro para opt-in de confirmação pública |
| `expira_em` | DateTime | Não | - | Data limite para confirmação |
| `confirmado_em` | DateTime | Sim | NULL | Momento da confirmação |
| `confirmado_ip` | GenericIP | Sim | NULL | IP da confirmação |

---

## 6. Tabela `shm_contrato_audit_log` (Módulo Contratos)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `contrato_id` | BigInt (FK) | Não | - | FK para `shm_contrato` |
| `tipo_evento` | VarChar(40) | Não | - | criacao, aceite, alteracao, conclusao, cancelamento, upload_documento, download_documento, exclusao_documento, atualizacao_emails, convite_email, confirmacao_email, recusa_email, download_relatorio, avaliacao_ciclo |
| `descricao` | TextField | Não | - | Detalhamento em prosa do evento |
| `justificativa` | TextField | Sim | NULL | Justificativa operacional obrigatória para eventos críticos |
| `documento_nome` | VarChar(255) | Sim | NULL | Nome do documento associado (quando aplicável) |
| `documento_hash` | VarChar(64) | Sim | NULL | Hash SHA-256 do documento associado |
| `usuario_id` | BigInt (FK) | Sim | NULL | FK para `shm_user` |
| `ip_origem` | GenericIP | Sim | NULL | Endereço IP do solicitante |
| `timestamp` | DateTime | Não | auto_now | Carimbo de data/hora |

---

## 7. Tabela `shm_pedido` (Módulo Pedidos)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `protocolo` | VarChar(20) | Não | - | Protocolo único sequencial OSYYYYMMNNNN |
| `cliente_id` | BigInt (FK) | Não | - | FK para `shm_cliente` |
| `contrato_id` | BigInt (FK) | Não | - | FK para `shm_contrato` |
| `titulo` | VarChar(200) | Não | - | Resumo do chamado |
| `status` | VarChar(25) | Não | aberto | aberto, em_orcamento, aguardando_aprovacao, em_execucao, aguardando_aceite, concluido, cancelado |

---

## 8. Tabela `shm_ciclo` (Módulo Ciclos)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `pedido_id` | BigInt (FK) | Não | - | FK para `shm_pedido` |
| `tipo` | VarChar(20) | Não | corretiva | corretiva, evolutiva, preventiva, analise, consultoria, treinamento, teste |
| `status` | VarChar(25) | Não | orcado | orcado, aguardando_aprovacao, aprovado, em_execucao, aguardando_aceite, aceito, cancelado |
| `horas_estimadas` | Decimal(8,2) | Não | 0.00 | Orçamento aprovado |
| `horas_realizadas` | Decimal(8,2) | Não | 0.00 | Somatório atômico das tarefas realizadas |
| `token_acesso` | UUIDField | Sim | NULL | Token de acesso via Magic Link |

---

## 9. Tabela `shm_tarefa` (Módulo Tarefas)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `ciclo_id` | BigInt (FK) | Não | - | FK para `shm_ciclo` |
| `titulo` | VarChar(200) | Não | - | Descrição do item técnico |
| `horas_estimadas` | Decimal(8,2) | Não | 0.00 | Estimativa da tarefa |
| `horas_realizadas` | Decimal(8,2) | Não | 0.00 | Horas efetivamente apontadas |
| `status` | VarChar(20) | Não | prevista | prevista, realizada, cancelada |

---

## 10. Tabela `shm_historico_saldo` (Módulo Saldo)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | UUIDField | Não | uuid4 | PK imutável UUIDv4 |
| `contrato_id` | BigInt (FK) | Não | - | FK para `shm_contrato` |
| `tipo_operacao` | VarChar(30) | Não | - | consumo, transferencia_envio, transferencia_recebimento, reabastecimento, estorno |
| `quantidade` | Decimal(8,2) | Não | - | Débito (-) ou crédito (+) de horas |
| `saldo_resultante` | Decimal(10,2) | Não | - | Snapshot exato do saldo após a operação |
| `autor_id` | BigInt (FK) | Sim | NULL | FK para `shm_user` |
| `pedido_id` | BigInt (FK) | Sim | NULL | FK para `shm_pedido` (se consumo) |
| `ciclo_id` | BigInt (FK) | Sim | NULL | FK para `shm_ciclo` (se consumo) |
| `operacao_original_id` | UUIDField | Sim | NULL | Apontador para histórico estornado |
| `ip_origem` | GenericIP | Sim | NULL | Rastreabilidade forense de IP |
| `user_agent` | TextField | Sim | NULL | Agente de navegação do solicitante |
| `metodo_aprovacao` | VarChar(50) | Não | APP | Canal de aprovação (APP, MAGIC_LINK) |
| `criado_em` | DateTime | Não | auto_now | Timestamp imutável |

---

## 11. Tabela `shm_transferencia_saldo` (Módulo Saldo)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | UUIDField | Não | uuid4 | PK UUIDv4 |
| `contrato_origem_id` | BigInt (FK) | Não | - | Contrato de onde as horas saem |
| `contrato_destino_id` | BigInt (FK) | Não | - | Contrato que recebe as horas |
| `quantidade` | Decimal(8,2) | Não | - | Horas transferidas |
| `motivo` | TextField | Não | - | Justificativa da transferência |
| `autor_id` | BigInt (FK) | Não | - | Usuário responsável |

---

## 12. Tabela `shm_configuracao_notificacao` (Módulo Notificações)

| Campo | Tipo | Nulo | Padrão | Descrição / Regras |
|---|---|---|---|---|
| `id` | BigAutoField | Não | Auto | Chave Primária PK |
| `codigo` | VarChar(60) | Não | - | Código único do evento (db_index, unique) |
| `categoria` | VarChar(30) | Não | - | autenticacao, clientes, contratos, saldo, pedidos, ciclos |
| `nome` | VarChar(150) | Não | - | Rótulo amigável exibido na UI |
| `descricao` | TextField | Não | - | Explicação detalhada do gatilho |
| `ativo_email` | Boolean | Não | True | Habilita disparo via e-mail SMTP |
| `ativo_in_app` | Boolean | Não | True | Habilita inserção em shm_notification |
| `notificar_empresa_admin` | Boolean | Não | True | Notifica Administradores |
| `notificar_empresa_tecnico` | Boolean | Não | True | Notifica Técnicos |
| `notificar_cliente_gerente` | Boolean | Não | True | Notifica Gestores do Cliente |
| `notificar_cliente_comum` | Boolean | Não | False | Notifica Solicitantes do Cliente |
| `notificar_gestor_contrato` | Boolean | Não | True | Notifica Gestor do Contrato |
| `notificar_emails_cc` | Boolean | Não | True | Notifica lista de e-mails em cópia |
| `emails_adicionais` | JSONField | Não | [] | Lista de e-mails fixos extras |
| `bloqueado_edicao` | Boolean | Não | False | Evento essencial do sistema |
| `nao_enviar_autor` | Boolean | Não | True | Supressão de e-mail e cópias (CC) para o autor da ação que disparou o evento |
