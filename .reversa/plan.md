# Plano de Exploração — SHM - Support Hours Manager

> Criado pelo Reversa em 2026-08-27
> Marque cada tarefa com ✅ quando concluída.
> Você pode editar este plano antes de iniciar: adicione, remova ou reordene tarefas conforme necessário.

---

## Fase 1: Reconhecimento 🔍

- [x] **Scout** — Mapeamento de estrutura de pastas e tecnologias
- [x] **Scout** — Análise de dependências e gerenciadores de pacotes
- [x] **Scout** — Identificação de entry points, CI/CD e configurações

## Decisão de organização das specs 🗂️

> Entre o Scout e o Arqueólogo, o Reversa pergunta como você quer organizar as specs (por módulo, caso de uso, endpoint, híbrida, por features ou customizada). A escolha fica persistida em `.reversa/config.toml` na seção `[specs]` e não será reperguntada em execuções futuras. Para reapresentar o menu, remova manualmente a seção.

## Fase 2: Escavação 🏗️

> O Reversa preenche esta seção com os módulos reais após o Scout concluir o reconhecimento.

- [x] **Arqueólogo** — Análise do módulo `accounts` (Autenticação, RBAC, Magic Login, Google OAuth)
- [x] **Arqueólogo** — Análise do módulo `clientes` (Cadastro PF/PJ, Validações, Magic Link de Aceite, Auditoria)
- [x] **Arqueólogo** — Análise do módulo `contratos` (Gestão de Contratos, Carência, Hashes SHA-256, Notificações)
- [x] **Arqueólogo** — Análise do módulo `pedidos` (Protocolo OS, Agrupador, Anexos, Sincronização de Status)
- [x] **Arqueólogo** — Análise do módulo `ciclos` (Decomposição, Orçamento, Execução, Aceite, Avaliação 1-5★)
- [x] **Arqueólogo** — Análise do módulo `tarefas` (Apontamentos de Horas Reais, Recálculo do Ciclo)
- [x] **Arqueólogo** — Análise do módulo `saldo` (Ledger Imutável, Transferências, Reabastecimentos)
- [x] **Arqueólogo** — Análise do módulo `comunicacao` (Threads de Comentários, Respostas em Árvore, Reações)
- [x] **Arqueólogo** — Análise do módulo `notificacoes` (Timeline de Eventos, Notificações In-App, E-mails)
- [x] **Arqueólogo** — Análise do módulo `core` (Base Models, Tratamento de Exceções, Seed Data)
- [x] **Arqueólogo** — Análise do módulo `frontend` (SPA React 19, TypeScript, TanStack Query, Tailwind CSS)

## Fase 3: Interpretação 🧠

- [x] **Detetive** — Arqueologia Git e ADRs retroativos
- [x] **Detetive** — Regras de negócio implícitas e máquinas de estado
- [x] **Detetive** — Matriz de permissões (RBAC/ACL)
- [x] **Arquiteto** — Diagramas C4 (Contexto, Containers, Componentes)
- [x] **Arquiteto** — ERD completo e integrações externas
- [x] **Arquiteto** — Spec Impact Matrix

## Fase 4: Geração 📝

- [x] **Redator** — Specs SDD por componente
- [x] **Redator** — OpenAPI (se aplicável)
- [x] **Redator** — User Stories (se aplicável)
- [x] **Redator** — Code/Spec Matrix

## Fase 5: Revisão ✅

- [x] **Revisor** — Revisão cruzada de specs
- [x] **Revisor** — Resolução de lacunas com o usuário
- [x] **Revisor** — Relatório de confiança final

---

## Agentes Independentes

> Execute estes agentes quando os recursos estiverem disponíveis — podem rodar em qualquer fase.

- [ ] **Visor** — Análise de interface via screenshots
- [ ] **Data Master** — Análise completa do banco de dados
- [ ] **Design System** — Extração de tokens de design
- [ ] **Tracer** — Análise dinâmica (requer sistema acessível)

---

## Próximo passo

Após o Time de Descoberta concluir e o `_reversa_sdd/` estar populado, você pode disparar um dos fluxos seguintes:

- `/reversa-migrate`: orquestrador do **Time de Migração** (Paradigm Advisor → Curator → Strategist → Designer → Screen Translator → Inspector). Gera as specs do sistema novo. Saída em `_reversa_sdd/migration/` e `_reversa_sdd/screens/`.
- `/reversa-reconstructor`: gera plano bottom-up para reimplementar o software a partir das specs do legado (uma tarefa por sessão).
