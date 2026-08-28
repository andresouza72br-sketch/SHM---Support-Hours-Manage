# Análise Técnica Consolidada de Código (Code Analysis)

> Gerado pelo **Reversa Archaeologist** em 2026-08-27  
> Sistema: **SHM 2.4 (Support Hours Manager)**  
> Escala de Confiança: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA

---

## 1. Visão Geral da Engenharia do Sistema

O SHM 2.4 é estruturado no padrão **Django Apps Modulares** no backend com arquitetura limpa e desacoplamento de serviços, e **React 19 SPA com TypeScript e TanStack Query** no frontend.

### 1.1 Stack Tecnológico & Arquitetura
- **Backend:** Django 5.2, Django REST Framework 3.15, SimpleJWT 5.3 (Tokens rotativos), drf-spectacular 0.28 (OpenAPI 3.0), validate-docbr 2.0 (Validação CPF/CNPJ).
- **Frontend:** React 19.0.0, TypeScript 5.7.3, Vite 6.1.0, Tailwind CSS 3.4.17, Axios 1.7.9, Lucide React 0.475, React Router 7.2.0.
- **Persistência:** SQLite3 (dev/local), PostgreSQL com psycopg2-binary (produção).
- **Segurança & Auditoria:** Hash SHA-256 para integridade documental, Magic Links criptográficos (UUIDv4) com expiração de 7 dias, Auditoria Forense em Clientes e Contratos, Ledger Imutável em Saldo.

---

## 2. Análise Detalhada por Módulo

### 2.1 Módulo `accounts` (Autenticação, RBAC e Tokens)
- **Modelos:** `User` (herda de `AbstractUser`), `PasswordlessLoginToken` 🟢.
- **Papéis de Acesso (RBAC):**
  1. `EMPRESA_ADMIN`: Gestão total de contratos, clientes, saldos e usuários.
  2. `EMPRESA_TECNICO`: Triagem operacional, estimativa de ciclos e apontamento de tarefas.
  3. `CLIENTE_GERENTE`: Tomador do contrato. Autoriza orçamentos, concede aceites finais e acessa extratos.
  4. `CLIENTE_ANALISTA`: Usuário solicitante. Abre pedidos de suporte e acompanha kanban.
- **Mecanismos de Login:**
  - Login tradicional (usuário/senha via JWT).
  - Magic Login sem senha: Gera `PasswordlessLoginToken` UUID com expiração configurável.
  - Google OAuth: Validação de ID Token do Google via `google-auth` no endpoint `/api/v1/auth/google/` com auto-provisionamento ou vinculação de avatar.

### 2.2 Módulo `clientes` (Gestão de Organizações Tomadoras)
- **Modelos:** `Cliente` (PF/PJ), `ClienteAceiteLink`, `ClienteAuditLog` 🟢.
- **Regras de Negócio & Algoritmos:**
  - Validação estrita de CNPJ (14 dígitos, cálculo de dois dígitos verificadores por pesos) e CPF (11 dígitos, cálculo dos dígitos verificadores) via funções dedicadas `validar_cnpj` e `validar_cpf` 🟢.
  - Obrigatoriedade condicional: Se PJ, exige `razao_social` e `cnpj`. Se PF, exige `nome_completo` e `cpf` 🟢.
  - Magic Link de Aceite Cadastral (7 dias): Disparado para e-mail do tomador aprovar o cadastro e ativar a organização sem login prévio 🟢.
  - Auditoria Forense (`ClienteAuditLog`): Registra criação, alteração, aprovação por magic link e exclusão (com justificativa obrigatória, IP, user-agent e autor) 🟢.

### 2.3 Módulo `contratos` (Gestão Contratual, Vigência e Documentos)
- **Modelos:** `Contrato`, `ContratoDocumento`, `ContratoAuditLog`, `AceiteLink`, `ContratoEmailNotificacao` 🟢.
- **Regras de Negócio & Algoritmos:**
  - Numeração padronizada `CT-YYYY-NNNN` 🟢.
  - Tipos: `novo`, `aditivo`, `renovacao`. Aditivos possuem FK recursiva `contrato_referencia` 🟢.
  - Carência de 30 dias (`data_fim_carencia`): Calculada na expiração do contrato. Durante a carência (`em_carencia = True`), o saldo positivo restante pode ser consumido em atendimentos de suporte sem bloqueio imediato 🟢.
  - Documentos & Integridade Criptográfica: Upload de arquivos gera hash SHA-256 (`hash_sha256`) e endpoint de verificação `/verificar_integridade/` recalcula o hash do arquivo em disco e atesta integridade contra manipulação 🟢.
  - Notificações por E-mail: Gestão de lista de destinatários (`ContratoEmailNotificacao`) com envio de convites e links de confirmação/recusa 🟢.

### 2.4 Módulo `pedidos` (Chamados de Suporte e Protocolos)
- **Modelos:** `Pedido`, `AnexoPedido` 🟢.
- **Regras de Negócio & Algoritmos:**
  - Geração de protocolo sequencial atômico diário/mensal: `OSYYYYMMNNNN` (ex: `OS2026080001`) via `PedidoService.gerar_protocolo()` 🟢.
  - Agrupador de Ciclos: Um pedido não tem esforço direto; ele é decomposto em 1 ou mais ciclos técnicos 🟢.
  - Sincronização Automática de Status (`PedidoService.sincronizar_status_pedido`): O status do pedido é recalculado automaticamente em cascata conforme os status dos seus ciclos (`aberto`, `em_orcamento`, `aguardando_aprovacao`, `em_execucao`, `aguardando_aceite`, `concluido`, `cancelado`) 🟢.

### 2.5 Módulo `ciclos` (Workflow Atômico, Orçamento, Aceite e Avaliação)
- **Modelos:** `Ciclo`, `CicloMagicLink`, `AvaliacaoCiclo` 🟢.
- **Classificação:** `corretiva`, `evolutiva`, `preventiva`, `analise`, `consultoria`, `treinamento`, `teste` 🟢.
- **Workflow Operacional:**
  1. Criação/Decomposição: Técnico define tipo e escopo (`orcado`).
  2. Apresentação de Orçamento: Técnico lança horas estimadas e emite Magic Link (`aguardando_aprovacao`).
  3. Aprovação pelo Cliente: Aprovação **não consome saldo** do contrato 🟢.
  4. Execução Técnica: Apontamento de tarefas pelo técnico (`em_execucao`).
  5. Solicitação de Aceite: Técnico solicita aceite final (`aguardando_aceite`).
  6. Concessão de Aceite: Cliente concede aceite formal. O sistema debita **exclusivamente as horas reais realizadas** (`horas_realizadas`) no ledger de saldo do contrato 🟢.
  7. Avaliação de Satisfação (`AvaliacaoCiclo`): Rating de 1 a 5 estrelas e feedback textual registrado após o aceite 🟢.

### 2.6 Módulo `tarefas` (Apontamento Técnico de Horas)
- **Modelos:** `Tarefa` (status: `prevista`, `realizada`, `cancelada`) 🟢.
- **Regras de Negócio & Algoritmos:**
  - No método `save()` e `delete()` de `Tarefa`, o somatório de `horas_realizadas` de todas as tarefas com status `realizada` é recalculado e gravado atômicamente no campo `ciclo.horas_realizadas` 🟢.

### 2.7 Módulo `saldo` (Ledger Imutável de Movimentações)
- **Modelos:** `HistoricoSaldo`, `TransferenciaSaldo`, `Reabastecimento` 🟢.
- **Regras de Negócio & Algoritmos:**
  - **Ledger Append-Only Imutável:** Todas as transações usam `select_for_update()` para isolamento e atomicidade ACID 🟢.
  - Operações: `consumo` (débito negativo por aceite de ciclo), `transferencia_envio` / `transferencia_recebimento` (entre contratos do mesmo cliente), `reabastecimento` (crédito autorizado) e `estorno` 🟢.
  - Metadados de Compliance: Cada registro de saldo guarda IP de origem, User-Agent, método de aprovação e autor 🟢.

### 2.8 Módulo `comunicacao` (Threads de Comentários e Reações)
- **Modelos:** `Comentario`, `AnexoComentario`, `ReacaoComentario` 🟢.
- **Recursos:**
  - Threading em árvore: FK recursiva `parent` para respostas aninhadas 🟢.
  - Reações de emoji: Toggle atômico por usuário (`unique_together = [['comentario', 'autor', 'tipo']]`) 🟢.
  - Conversão em Tarefa: Endpoint `/converter_em_tarefa/` cria uma tarefa diretamente a partir de um comentário 🟢.

### 2.9 Módulo `notificacoes` (Timeline e Notificações In-App)
- **Modelos:** `TimelineEvent`, `Notification` 🟢.
- **Recursos:**
  - Timeline de auditoria com histórico cronológico de cada transição de pedido e ciclo 🟢.
  - Disparo de e-mails de notificação formatados em HTML para gestores e técnicos 🟢.

### 2.10 Módulo `frontend` (React 19 SPA)
- **Arquitetura de Estado:** TanStack Query com invalidação de cache estratégica após mutações 🟢.
- **Componentes Chave:** Kanban Board de 6 colunas, Carrossel de Ciclos, Modais de Gestão Contratual, Switch Light/Dark Mode com contraste otimizado 🟢.

---

## 3. Matriz de Algoritmos & Regras de Ouro

| Regra / Algoritmo | Módulo Responsável | Criticidade | Validação |
|---|---|---|---|
| Validação de CNPJ e CPF | `clientes` | Crítica | Matemática (Dígitos Verificadores) 🟢 |
| Débito Exclusivo no Aceite | `ciclos` / `saldo` | Crítica | Débito de horas_realizadas apenas em aceite formal 🟢 |
| Sincronização de Status do Pedido | `pedidos` | Alta | Cascata baseada nos ciclos vinculados 🟢 |
| Recálculo de Horas do Ciclo | `tarefas` | Alta | Somatório de tarefas realizadas 🟢 |
| Transferência entre Contratos | `saldo` | Alta | Restrito a contratos do mesmo cliente 🟢 |
| Hash SHA-256 de Documentos | `contratos` | Alta | Checksum criptográfico de integridade 🟢 |
