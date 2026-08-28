import os, json, datetime, re

now = datetime.datetime.now(datetime.timezone.utc).isoformat()
os.makedirs("_reversa_sdd/openapi", exist_ok=True)
os.makedirs("_reversa_sdd/user-stories", exist_ok=True)
os.makedirs("_reversa_sdd/traceability", exist_ok=True)

modules = [
  "accounts", "clientes", "contratos", "pedidos", "ciclos",
  "tarefas", "saldo", "comunicacao", "notificacoes", "frontend"
]

for m in modules:
  os.makedirs(os.path.join("_reversa_sdd", m), exist_ok=True)

# 1. ACCOUNTS UNIT
with open("_reversa_sdd/accounts/requirements.md", "w", encoding="utf-8") as f:
  f.write("""# Requisitos do Módulo Accounts

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Módulo responsável pela autenticação de usuários, gestão de perfis de acesso RBAC (Empresa vs Cliente), login por Magic Link sem senha e autenticação Single Sign-On com Google OAuth.

## 2. Requisitos Funcionais
- **RF-ACC-01 (Must):** Autenticar usuários via JWT com Access Token (60 min) e Refresh Token rotativo (7 dias) 🟢.
- **RF-ACC-02 (Must):** Suportar 4 papéis de acesso: `EMPRESA_ADMIN`, `EMPRESA_TECNICO`, `CLIENTE_GERENTE`, `CLIENTE_ANALISTA` 🟢.
- **RF-ACC-03 (Should):** Gerar Magic Login Link UUIDv4 sem senha para acesso direto por e-mail 🟢.
- **RF-ACC-04 (Should):** Permitir login via Google OAuth 2.0 validando o ID Token emitido pelo Google e sincronizando `avatar_url` 🟢.

## 3. Critérios de Aceitação
```gherkin
Cenário: Login bem-sucedido com JWT
  Dado que o usuário envia username e senha válidos para /api/v1/auth/login/
  Quando a requisição for processada
  Então o sistema retorna 200 OK com access token, refresh token e dados do usuário.

Cenário: Tentativa de login com senha inválida
  Dado que o usuário envia senha incorreta
  Quando a requisição for processada
  Então o sistema retorna 401 Unauthorized com mensagem de credenciais inválidas.
```
""")

with open("_reversa_sdd/accounts/design.md", "w", encoding="utf-8") as f:
  f.write("""# Design do Módulo Accounts

## 1. Estrutura de Classes e Modelos
- `User` herda de `AbstractUser` e adiciona `role`, `telefone`, `avatar_url` e `cliente` (FK).
- `PasswordlessLoginToken`: `token` (UUIDv4), `expira_em`, `usado`, `ip_origem`, `user_agent`.

## 2. Endpoints e Rotas
- `POST /api/v1/auth/login/`: Autenticação por credenciais.
- `POST /api/v1/auth/refresh/`: Renovação de token JWT.
- `POST /api/v1/auth/magic-login/`: Emissão de token sem senha.
- `POST /api/v1/auth/magic-login/confirmar/`: Troca de token por JWT.
- `POST /api/v1/auth/google/`: Validação de ID Token Google.
- `GET /api/v1/auth/me/`: Perfil do usuário autenticado.
""")

with open("_reversa_sdd/accounts/tasks.md", "w", encoding="utf-8") as f:
  f.write("""# Tarefas de Implementação — Accounts

- [x] **TASK-ACC-01:** Implementar modelo customizado `User` com `UserRole` choices 🟢 (`backend/apps/accounts/models.py`).
- [x] **TASK-ACC-02:** Configurar `SimpleJWT` com rotação de refresh tokens 🟢 (`backend/config/settings.py`).
- [x] **TASK-ACC-03:** Implementar fluxo de Magic Login sem senha 🟢 (`backend/apps/accounts/views.py`).
- [x] **TASK-ACC-04:** Integrar autenticação Google OAuth com validação de token 🟢 (`backend/apps/accounts/views.py`).
""")

with open("_reversa_sdd/accounts/contracts.md", "w", encoding="utf-8") as f:
  f.write("""# Contratos de API — Accounts

## POST /api/v1/auth/login/
**Request:** `{"username": "admin", "password": "admin123"}`  
**Response 200:** `{"access": "...", "refresh": "...", "user": {"id": 1, "username": "admin", "role": "EMPRESA_ADMIN"}}`
""")

# 2. CLIENTES UNIT
with open("_reversa_sdd/clientes/requirements.md", "w", encoding="utf-8") as f:
  f.write("""# Requisitos do Módulo Clientes

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Gestão cadastral de organizações tomadoras (Pessoa Jurídica ou Pessoa Física), validação de documentos fiscais, workflow de aceite de cadastro via Magic Link e log de auditoria forense.

## 2. Requisitos Funcionais
- **RF-CLI-01 (Must):** Cadastrar clientes como PJ (exigindo Razão Social e CNPJ válido) ou PF (exigindo Nome Completo e CPF válido) 🟢.
- **RF-CLI-02 (Must):** Validar matematicamente dígitos verificadores de CPF e CNPJ 🟢.
- **RF-CLI-03 (Must):** Criar cliente no status `pendente_aprovacao` e emitir link de aceite com validade de 7 dias para o gestor 🟢.
- **RF-CLI-04 (Must):** Registrar log imutável de auditoria (`ClienteAuditLog`) para criação, alteração e exclusão 🟢.

## 3. Critérios de Aceitação
```gherkin
Cenário: Cadastro de PJ com CNPJ inválido
  Dado que o operador submete cadastro PJ com CNPJ de dígitos incorretos
  Quando o sistema executa a validação
  Então retorna 400 Bad Request com erro 'CNPJ inválido'.

Cenário: Aceite de cadastro via Magic Link
  Dado que o gestor acessa o Magic Link válido de 7 dias
  Quando clica em confirmar aceite
  Então o cliente passa para status 'ativo' e um registro de auditoria é gravado.
```
""")

with open("_reversa_sdd/clientes/design.md", "w", encoding="utf-8") as f:
  f.write("""# Design do Módulo Clientes

## 1. Modelos
- `Cliente`: tipo (PF/PJ), razao_social, cnpj, nome_completo, cpf, email_contato, status, emails_notificacao_padrao.
- `ClienteAceiteLink`: cliente (FK), token (UUIDv4), data_expiracao, usado.
- `ClienteAuditLog`: cliente_nome, tipo_evento, justificativa, usuario, ip_origem, user_agent.
""")

with open("_reversa_sdd/clientes/tasks.md", "w", encoding="utf-8") as f:
  f.write("""# Tarefas — Clientes

- [x] **TASK-CLI-01:** Criar modelo `Cliente` com validações no clean() 🟢 (`backend/apps/clientes/models.py`).
- [x] **TASK-CLI-02:** Implementar algoritmos `validar_cnpj` e `validar_cpf` 🟢 (`backend/apps/clientes/models.py`).
- [x] **TASK-CLI-03:** Implementar viewset de clientes e endpoints de aceite público 🟢 (`backend/apps/clientes/views.py`).
""")

with open("_reversa_sdd/clientes/contracts.md", "w", encoding="utf-8") as f:
  f.write("""# Contratos — Clientes

## POST /api/v1/clientes/
**Request:** `{"tipo": "PJ", "razao_social": "Acme Corp Ltda", "cnpj": "12.345.678/0001-90", "email_contato": "contato@acme.com"}`  
**Response 201:** `{"id": 1, "status": "pendente_aprovacao", "display_name": "Acme Corp Ltda"}`
""")

# 3. CONTRATOS UNIT
with open("_reversa_sdd/contratos/requirements.md", "w", encoding="utf-8") as f:
  f.write("""# Requisitos do Módulo Contratos

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Gestão contratual com código CT-YYYY-NNNN, controle de franquia de horas, vigência e carência de 30 dias, aditivos recursivos, hash SHA-256 de documentos e gestão de destinatários de notificações.

## 2. Requisitos Funcionais
- **RF-CON-01 (Must):** Controlar franquia de horas contratadas, saldo atual e horas consumidas 🟢.
- **RF-CON-02 (Must):** Calcular automaticamente carência de 30 dias pós-expiração (`data_fim_carencia`) e permitir consumo de saldo remanescente 🟢.
- **RF-CON-03 (Must):** Gerar hash SHA-256 no upload de documentos e fornecer endpoint de verificação de integridade 🟢.
- **RF-CON-04 (Should):** Permitir aditivos vinculados ao contrato original (`contrato_referencia`) 🟢.
""")

with open("_reversa_sdd/contratos/design.md", "w", encoding="utf-8") as f:
  f.write("""# Design do Módulo Contratos

## 1. Modelos
- `Contrato`: numero, tipo, cliente (FK), data_inicio, data_termino, data_fim_carencia, horas_contratadas, saldo, status.
- `ContratoDocumento`: contrato (FK), arquivo, hash_sha256, tamanho_bytes, tipo_documento.
- `ContratoAuditLog`: contrato (FK), tipo_evento, justificativa, documento_hash, usuario, ip_origem.
""")

with open("_reversa_sdd/contratos/tasks.md", "w", encoding="utf-8") as f:
  f.write("""# Tarefas — Contratos

- [x] **TASK-CON-01:** Modelagem do `Contrato` com properties `em_carencia` e `saldo_remanescente` 🟢 (`backend/apps/contratos/models.py`).
- [x] **TASK-CON-02:** Implementar upload de documentos com cálculo de SHA-256 🟢 (`backend/apps/contratos/views.py`).
- [x] **TASK-CON-03:** Implementar verificação de integridade documental 🟢 (`backend/apps/contratos/views.py`).
""")

with open("_reversa_sdd/contratos/contracts.md", "w", encoding="utf-8") as f:
  f.write("""# Contratos — Contratos

## GET /api/v1/contratos/{id}/extrato/
**Response 200:** `{"contrato": "CT-2026-0001", "saldo": 85.50, "horas_contratadas": 100.00, "horas_consumidas": 14.50, "em_carencia": false}`
""")

# 4. PEDIDOS UNIT
with open("_reversa_sdd/pedidos/requirements.md", "w", encoding="utf-8") as f:
  f.write("""# Requisitos do Módulo Pedidos

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Chamados de suporte técnico unificados, geração de protocolo sequencial `OSYYYYMMNNNN`, agrupador de ciclos e sincronização automática de status.

## 2. Requisitos Funcionais
- **RF-PED-01 (Must):** Gerar protocolo sequencial atômico `OSYYYYMMNNNN` na criação 🟢.
- **RF-PED-02 (Must):** Vincular pedido obrigatoriamente a Cliente e Contrato ativo ou em carência 🟢.
- **RF-PED-03 (Must):** Sincronizar status do pedido automaticamente em cascata conforme os ciclos associados 🟢.
""")

with open("_reversa_sdd/pedidos/design.md", "w", encoding="utf-8") as f:
  f.write("""# Design do Módulo Pedidos

## 1. Modelos
- `Pedido`: protocolo, cliente (FK), contrato (FK), assunto, descricao, prioridade, status, criado_por (FK).
- `AnexoPedido`: pedido (FK), arquivo, nome_original, tamanho.

## 2. Serviços
- `PedidoService.gerar_protocolo()`: Gera protocolo sequencial diário/mensal.
- `PedidoService.sincronizar_status_pedido()`: Avalia status dos ciclos e atualiza status do pedido.
""")

with open("_reversa_sdd/pedidos/tasks.md", "w", encoding="utf-8") as f:
  f.write("""# Tarefas — Pedidos

- [x] **TASK-PED-01:** Modelagem de `Pedido` e `AnexoPedido` 🟢 (`backend/apps/pedidos/models.py`).
- [x] **TASK-PED-02:** Implementar `PedidoService.gerar_protocolo` 🟢 (`backend/apps/pedidos/services.py`).
- [x] **TASK-PED-03:** Implementar `PedidoService.sincronizar_status_pedido` 🟢 (`backend/apps/pedidos/services.py`).
""")

with open("_reversa_sdd/pedidos/contracts.md", "w", encoding="utf-8") as f:
  f.write("""# Contratos — Pedidos

## POST /api/v1/pedidos/
**Request:** `{"cliente": 1, "contrato": 1, "assunto": "Falha no servidor de banco", "descricao": "...", "prioridade": "alta"}`  
**Response 201:** `{"id": 1, "protocolo": "OS2026080001", "status": "aberto"}`
""")

# 5. CICLOS UNIT
with open("_reversa_sdd/ciclos/requirements.md", "w", encoding="utf-8") as f:
  f.write("""# Requisitos do Módulo Ciclos

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Coração operacional do SHM: decomposição atômica de pedidos em ciclos especializados, orçamentação, execução, aceite formal com débito exclusivo de horas reais e avaliação pós-aceite.

## 2. Requisitos Funcionais
- **RF-CIC-01 (Must):** Decompor pedidos em ciclos classificados (`corretiva`, `evolutiva`, `preventiva`, `analise`, `consultoria`, `treinamento`, `teste`) 🟢.
- **RF-CIC-02 (Must):** Apresentação de orçamento gera Magic Link UUIDv4 de 7 dias 🟢.
- **RF-CIC-03 (Must):** Aprovação de orçamento **não debita saldo** do contrato 🟢.
- **RF-CIC-04 (Must):** Aceite formal pelo cliente debita **exclusivamente as horas reais realizadas** no contrato 🟢.
- **RF-CIC-05 (Should):** Disparar avaliação de satisfação (1-5 estrelas + feedback) após o aceite 🟢.
""")

with open("_reversa_sdd/ciclos/design.md", "w", encoding="utf-8") as f:
  f.write("""# Design do Módulo Ciclos

## 1. Modelos
- `Ciclo`: pedido (FK), tipo, operador (FK), status, horas_estimadas, horas_realizadas, token_acesso, aceito_em, aceito_por.
- `CicloMagicLink`: ciclo (FK), tipo_acao, token, expira_em, usado.
- `AvaliacaoCiclo`: ciclo (1:1), avaliador (FK), nota (1-5), comentario.

## 2. Serviços
- `CicloService.apresentar_orcamento()`: Transiciona para `aguardando_aprovacao` e emite Magic Link.
- `CicloService.aprovar_orcamento()`: Transiciona para `aprovado` (sem débito).
- `CicloService.aceitar_ciclo()`: Transiciona para `aceito`, invoca `SaldoService.consumir(horas_realizadas)` e dispara avaliação.
""")

with open("_reversa_sdd/ciclos/tasks.md", "w", encoding="utf-8") as f:
  f.write("""# Tarefas — Ciclos

- [x] **TASK-CIC-01:** Modelagem de `Ciclo` e `CicloMagicLink` 🟢 (`backend/apps/ciclos/models.py`).
- [x] **TASK-CIC-02:** Implementar `CicloService` completo com transações atômicas 🟢 (`backend/apps/ciclos/services.py`).
- [x] **TASK-CIC-03:** Implementar modelo `AvaliacaoCiclo` e endpoint `/avaliar/` 🟢 (`backend/apps/ciclos/views.py`).
""")

with open("_reversa_sdd/ciclos/contracts.md", "w", encoding="utf-8") as f:
  f.write("""# Contratos — Ciclos

## POST /api/v1/ciclos/{id}/aceitar/
**Request:** `{}` (com JWT ou via Magic Link)  
**Response 200:** `{"id": 1, "status": "aceito", "horas_realizadas": 6.00, "horas_debitadas": 6.00}`
""")

# 6. TAREFAS UNIT
with open("_reversa_sdd/tarefas/requirements.md", "w", encoding="utf-8") as f:
  f.write("""# Requisitos do Módulo Tarefas

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Apontamentos granulares de horas e serviços técnicos executados dentro de um ciclo.

## 2. Requisitos Funcionais
- **RF-TAR-01 (Must):** Criar tarefas vinculadas a um ciclo com `horas_estimadas` e `horas_realizadas` 🟢.
- **RF-TAR-02 (Must):** Ao salvar ou deletar uma tarefa com status `realizada`, recalcular atômicamente o campo `ciclo.horas_realizadas` 🟢.
""")

with open("_reversa_sdd/tarefas/design.md", "w", encoding="utf-8") as f:
  f.write("""# Design do Módulo Tarefas

## 1. Modelos
- `Tarefa`: ciclo (FK), descricao, horas_estimadas, horas_realizadas, status (`prevista`, `realizada`, `cancelada`), operador (FK).
- Métodos `save()` e `delete()` sobrescritos para somar tarefas realizadas e atualizar o ciclo pai.
""")

with open("_reversa_sdd/tarefas/tasks.md", "w", encoding="utf-8") as f:
  f.write("""# Tarefas — Tarefas

- [x] **TASK-TAR-01:** Modelagem da `Tarefa` e override do save/delete para recálculo de horas 🟢 (`backend/apps/tarefas/models.py`).
""")

with open("_reversa_sdd/tarefas/contracts.md", "w", encoding="utf-8") as f:
  f.write("""# Contratos — Tarefas

## POST /api/v1/tarefas/
**Request:** `{"ciclo": 1, "descricao": "Correção da query SQL", "horas_realizadas": 3.50, "status": "realizada"}`  
**Response 201:** `{"id": 1, "ciclo": 1, "horas_realizadas": 3.50, "status": "realizada"}`
""")

# 7. SALDO UNIT
with open("_reversa_sdd/saldo/requirements.md", "w", encoding="utf-8") as f:
  f.write("""# Requisitos do Módulo Saldo

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Ledger append-only imutável de saldo (`HistoricoSaldo`), transferências de horas entre contratos do mesmo cliente e reabastecimentos autorizados.

## 2. Requisitos Funcionais
- **RF-SAL-01 (Must):** Registrar consumo negativo no ledger exclusivamente no aceite de ciclos 🟢.
- **RF-SAL-02 (Must):** Executar transferências de horas apenas entre contratos do mesmo cliente 🟢.
- **RF-SAL-03 (Must):** Usar `select_for_update()` em todas as movimentações financeiras de horas 🟢.
""")

with open("_reversa_sdd/saldo/design.md", "w", encoding="utf-8") as f:
  f.write("""# Design do Módulo Saldo

## 1. Modelos
- `HistoricoSaldo`: id (UUID), contrato (FK), tipo_operacao, quantidade, saldo_resultante, autor, pedido, ciclo, ip_origem.
- `TransferenciaSaldo`: contrato_origem (FK), contrato_destino (FK), quantidade, motivo, autor.
- `Reabastecimento`: contrato (FK), quantidade, motivo, autor.
""")

with open("_reversa_sdd/saldo/tasks.md", "w", encoding="utf-8") as f:
  f.write("""# Tarefas — Saldo

- [x] **TASK-SAL-01:** Modelagem do `HistoricoSaldo` imutável 🟢 (`backend/apps/saldo/models.py`).
- [x] **TASK-SAL-02:** Implementar `SaldoService` com transações ACID e bloqueio pessimista 🟢 (`backend/apps/saldo/services.py`).
""")

with open("_reversa_sdd/saldo/contracts.md", "w", encoding="utf-8") as f:
  f.write("""# Contratos — Saldo

## POST /api/v1/saldo/transferir/
**Request:** `{"contrato_origem": 1, "contrato_destino": 2, "quantidade": 10.00, "motivo": "Remanejamento"}`  
**Response 200:** `{"status": "sucesso", "quantidade": 10.00}`
""")

# 8. COMUNICACAO UNIT
with open("_reversa_sdd/comunicacao/requirements.md", "w", encoding="utf-8") as f:
  f.write("""# Requisitos do Módulo Comunicação

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Threads de comentários em ciclos e tarefas, respostas em árvore, reações por emojis e conversão de comentário em tarefa.

## 2. Requisitos Funcionais
- **RF-COM-01 (Must):** Permitir comentários com anexos em ciclos e tarefas 🟢.
- **RF-COM-02 (Should):** Suportar respostas aninhadas (`parent`) em árvore 🟢.
- **RF-COM-03 (Should):** Suportar reações com emojis (toggle único por usuário e tipo) 🟢.
- **RF-COM-04 (Should):** Permitir ao técnico converter um comentário em tarefa técnica 🟢.
""")

with open("_reversa_sdd/comunicacao/design.md", "w", encoding="utf-8") as f:
  f.write("""# Design do Módulo Comunicação

## 1. Modelos
- `Comentario`: ciclo (FK), tarefa (FK), autor (FK), texto, parent (FK recursiva), tarefa_convertida (FK).
- `AnexoComentario`: comentario (FK), arquivo, nome_original, tamanho.
- `ReacaoComentario`: comentario (FK), autor (FK), tipo (`unique_together = [['comentario', 'autor', 'tipo']]`).
""")

with open("_reversa_sdd/comunicacao/tasks.md", "w", encoding="utf-8") as f:
  f.write("""# Tarefas — Comunicação

- [x] **TASK-COM-01:** Modelagem de `Comentario`, `AnexoComentario` e `ReacaoComentario` 🟢 (`backend/apps/comunicacao/models.py`).
- [x] **TASK-COM-02:** Implementar endpoint de conversão em tarefa 🟢 (`backend/apps/comunicacao/views.py`).
""")

with open("_reversa_sdd/comunicacao/contracts.md", "w", encoding="utf-8") as f:
  f.write("""# Contratos — Comunicação

## POST /api/v1/comunicacao/comentarios/{id}/reagir/
**Request:** `{"tipo": "like"}`  
**Response 200:** `{"reagiu": true, "tipo": "like", "total_reacoes": 3}`
""")

# 9. NOTIFICACOES UNIT
with open("_reversa_sdd/notificacoes/requirements.md", "w", encoding="utf-8") as f:
  f.write("""# Requisitos do Módulo Notificações

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Timeline cronológica de eventos de auditoria de pedidos e ciclos, notificações in-app e disparo de e-mails transacionais.

## 2. Requisitos Funcionais
- **RF-NOT-01 (Must):** Gravar `TimelineEvent` a cada transição de status de pedido e ciclo 🟢.
- **RF-NOT-02 (Must):** Criar `Notification` in-app para os usuários afetados 🟢.
- **RF-NOT-03 (Should):** Disparar e-mails HTML com links diretos para aprovações 🟢.
""")

with open("_reversa_sdd/notificacoes/design.md", "w", encoding="utf-8") as f:
  f.write("""# Design do Módulo Notificações

## 1. Modelos
- `TimelineEvent`: pedido (FK), ciclo (FK), tipo, descricao, autor (FK), timestamp.
- `Notification`: usuario (FK), titulo, mensagem, url, lida.
""")

with open("_reversa_sdd/notificacoes/tasks.md", "w", encoding="utf-8") as f:
  f.write("""# Tarefas — Notificações

- [x] **TASK-NOT-01:** Modelagem de `TimelineEvent` e `Notification` 🟢 (`backend/apps/notificacoes/models.py`).
- [x] **TASK-NOT-02:** Implementar `NotificacaoService` 🟢 (`backend/apps/notificacoes/services.py`).
""")

with open("_reversa_sdd/notificacoes/contracts.md", "w", encoding="utf-8") as f:
  f.write("""# Contratos — Notificações

## GET /api/v1/notificacoes/
**Response 200:** `{"results": [{"id": 1, "titulo": "Orçamento Apresentado", "lida": false}]}`
""")

# 10. FRONTEND UNIT
with open("_reversa_sdd/frontend/requirements.md", "w", encoding="utf-8") as f:
  f.write("""# Requisitos do Módulo Frontend

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Interface web Single-Page Application (SPA) em React 19, TypeScript, Tailwind CSS e TanStack Query, com Kanban Board de 6 colunas, carrossel de ciclos e tema claro/escuro.

## 2. Requisitos Funcionais
- **RF-FRN-01 (Must):** Renderizar Kanban Board de 6 colunas na fila operacional (`AdminDashboardPage`) 🟢.
- **RF-FRN-02 (Must):** Prover páginas públicas de Magic Link para aprovação sem autenticação 🟢.
- **RF-FRN-03 (Should):** Suportar alternância de tema Light/Dark com alto contraste 🟢.
""")

with open("_reversa_sdd/frontend/design.md", "w", encoding="utf-8") as f:
  f.write("""# Design do Módulo Frontend

## 1. Páginas Principais (14 Páginas)
- `LoginPage`, `AdminDashboardPage`, `DashboardPage`, `ClientesPage`, `AceiteClientePage`, `ContratosPage`, `AceiteContratoPage`, `ExtratoContratoPage`, `NovoPedidoPage`, `DetalhePedidoPage`, `AnalisePedidoPage`, `ExecucaoCicloPage`, `MagicLinkPage`, `ConfirmarNotificacaoPage`.
""")

with open("_reversa_sdd/frontend/tasks.md", "w", encoding="utf-8") as f:
  f.write("""# Tarefas — Frontend

- [x] **TASK-FRN-01:** Implementar cliente Axios com auto-refresh JWT 🟢 (`frontend/src/api/client.ts`).
- [x] **TASK-FRN-02:** Implementar Kanban Board e componentes de Ciclos 🟢 (`frontend/src/components/`).
- [x] **TASK-FRN-03:** Implementar páginas de gestão e Magic Links 🟢 (`frontend/src/pages/`).
""")

with open("_reversa_sdd/frontend/contracts.md", "w", encoding="utf-8") as f:
  f.write("""# Contratos — Frontend

Interface consome endpoints `/api/v1/` com autenticação `Bearer <access_token>`.
""")

# GLOBALS
with open("_reversa_sdd/openapi/openapi.yaml", "w", encoding="utf-8") as f:
  f.write("""openapi: 3.0.3
info:
  title: SHM API — Support Hours Manager
  version: 2.4.0
  description: API REST para governança, controle de horas técnicas, gestão contratual, decomposição em ciclos atômicos e ledger imutável.
paths:
  /api/v1/status/:
    get:
      summary: Health check e status do serviço
      responses:
        '200':
          description: OK
  /api/v1/auth/login/:
    post:
      summary: Login JWT
      responses:
        '200':
          description: Tokens emitidos
  /api/v1/pedidos/:
    get:
      summary: Listar pedidos de suporte
      responses:
        '200':
          description: Lista de pedidos
    post:
      summary: Criar novo pedido de suporte
      responses:
        '201':
          description: Pedido criado
  /api/v1/ciclos/{id}/aceitar/:
    post:
      summary: Aceite formal do ciclo com débito de saldo
      responses:
        '200':
          description: Ciclo aceito e horas debitadas no contrato
""")

with open("_reversa_sdd/user-stories/fluxo-atendimento-completo.md", "w", encoding="utf-8") as f:
  f.write("""# User Story: Fluxo de Atendimento Completo (Demanda -> Orçamento -> Execução -> Aceite -> Avaliação)

**Como** Gerente Tomador do Cliente,  
**Quero** abrir pedidos, aprovar orçamentos sem débito antecipado e validar aceites formais com débito apenas das horas reais,  
**Para que** eu tenha transparência financeira total e pague exclusivamente pelo esforço técnico homologado.

## Cenário Principal de Sucesso:
1. Cliente abre chamado via `/api/v1/pedidos/` gerando protocolo `OS2026080001`.
2. Técnico decompõe em Ciclo de Atendimento Corretiva com 8h estimadas.
3. Técnico apresenta orçamento; sistema dispara Magic Link para o tomador.
4. Tomador aprova orçamento no smartphone; saldo do contrato permanece intacto (0h debitadas).
5. Técnico executa o trabalho e aponta 6h reais em tarefas realizadas.
6. Técnico solicita aceite formal.
7. Tomador concede aceite; sistema debita 6h reais do contrato no ledger `HistoricoSaldo`.
8. Tomador atribui 5 estrelas na avaliação de satisfação.
""")

with open("_reversa_sdd/user-stories/fluxo-onboarding-cliente.md", "w", encoding="utf-8") as f:
  f.write("""# User Story: Onboarding e Aceite Cadastral de Cliente

**Como** Administrador da Empresa Prestadora,  
**Quero** cadastrar novas organizações (PF/PJ) e coletar aceite formal por Magic Link,  
**Para que** os dados cadastrais sejam verificados e auditados com validade jurídica antes do início dos atendimentos.
""")

with open("_reversa_sdd/user-stories/fluxo-gestao-contratual-documentos.md", "w", encoding="utf-8") as f:
  f.write("""# User Story: Gestão Contratual com Integridade Criptográfica

**Como** Administrador da Empresa Prestadora,  
**Quero** anexar propostas e contratos com cálculo automático de hash SHA-256,  
**Para que** a integridade dos documentos seja inviolável e verificável a qualquer momento.
""")

with open("_reversa_sdd/traceability/code-spec-matrix.md", "w", encoding="utf-8") as f:
  f.write("""# Matriz de Rastreabilidade Código vs Especificação (Code/Spec Matrix)

> Gerado pelo **Reversa Writer** em 2026-08-27

| Arquivo do Legado | Unit Correspondente | Cobertura |
|---|---|---|
| `backend/apps/accounts/models.py` | `accounts/` | 🟢 CONFIRMADO |
| `backend/apps/accounts/views.py` | `accounts/` | 🟢 CONFIRMADO |
| `backend/apps/accounts/serializers.py` | `accounts/` | 🟢 CONFIRMADO |
| `backend/apps/clientes/models.py` | `clientes/` | 🟢 CONFIRMADO |
| `backend/apps/clientes/views.py` | `clientes/` | 🟢 CONFIRMADO |
| `backend/apps/contratos/models.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/apps/contratos/views.py` | `contratos/` | 🟢 CONFIRMADO |
| `backend/apps/pedidos/models.py` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/apps/pedidos/views.py` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/apps/pedidos/services.py` | `pedidos/` | 🟢 CONFIRMADO |
| `backend/apps/ciclos/models.py` | `ciclos/` | 🟢 CONFIRMADO |
| `backend/apps/ciclos/views.py` | `ciclos/` | 🟢 CONFIRMADO |
| `backend/apps/ciclos/services.py` | `ciclos/` | 🟢 CONFIRMADO |
| `backend/apps/tarefas/models.py` | `tarefas/` | 🟢 CONFIRMADO |
| `backend/apps/saldo/models.py` | `saldo/` | 🟢 CONFIRMADO |
| `backend/apps/saldo/services.py` | `saldo/` | 🟢 CONFIRMADO |
| `backend/apps/comunicacao/models.py` | `comunicacao/` | 🟢 CONFIRMADO |
| `backend/apps/notificacoes/models.py` | `notificacoes/` | 🟢 CONFIRMADO |
| `frontend/src/App.tsx` | `frontend/` | 🟢 CONFIRMADO |
| `frontend/src/pages/*` | `frontend/` | 🟢 CONFIRMADO |
| `frontend/src/api/client.ts` | `frontend/` | 🟢 CONFIRMADO |
""")

# Update plan.md
with open(".reversa/plan.md", "r", encoding="utf-8") as f:
  plan = f.read()

plan = re.sub(r"- \[ \] \*\*Redator\*\*", "- [x] **Redator**", plan)
with open(".reversa/plan.md", "w", encoding="utf-8") as f:
  f.write(plan)

# Update state.json
with open(".reversa/state.json", "r", encoding="utf-8") as f:
  state = json.load(f)

state["phase"] = "revisao"
state["completed"] = ["reconhecimento", "escavacao", "interpretacao", "geracao"]
state["pending"] = ["revisao"]
state["checkpoints"]["writer"] = {
  "completed_at": now,
  "units_generated": modules,
  "total_files_generated": 45,
  "globals": [
    "_reversa_sdd/openapi/openapi.yaml",
    "_reversa_sdd/user-stories/fluxo-atendimento-completo.md",
    "_reversa_sdd/user-stories/fluxo-onboarding-cliente.md",
    "_reversa_sdd/user-stories/fluxo-gestao-contratual-documentos.md",
    "_reversa_sdd/traceability/code-spec-matrix.md"
  ]
}

with open(".reversa/state.json", "w", encoding="utf-8") as f:
  json.dump(state, f, indent=2, ensure_ascii=False)

print("Phase 4 Writer completed successfully!")
