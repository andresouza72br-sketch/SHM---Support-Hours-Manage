# Inventário do Sistema — SHM (Support Hours Manager)

> Gerado pelo **Reversa Scout** em 2026-09-04  
> Versão do Sistema: **SHM 2.5.0 (Feature 003 — Supressão de Notificações para o Autor incorporada)**  
> Nível de Documentação: **Aguardando seleção**  

---

## 1. Visão Geral da Superfície

O **SHM (Support Hours Manager)** é um sistema web fullstack para governança, controle de horas técnicas, gestão contratual, decomposição em ciclos atômicos, ledger imutável de saldo, notificações declarativas e aprovações via Magic Links.

### Resumo Quantitativo
- **Linguagem Principal Backend:** Python 3.12+ (Django 5.2 + Django REST Framework 3.15.0)
- **Linguagem Principal Frontend:** TypeScript / React 19 (Vite 6.1 + Tailwind CSS 3.4 + TanStack Query 5.66)
- **Total de Módulos Backend (Apps Django):** 10 apps (`accounts`, `clientes`, `contratos`, `pedidos`, `ciclos`, `tarefas`, `saldo`, `comunicacao`, `notificacoes`, `core`)
- **Total de Páginas Frontend:** 15 páginas React SPA
- **Bancos de Dados:** SQLite (desenvolvimento / demo) e PostgreSQL (produção)
- **Testes Automatizados:** 8 suítes completas de testes no backend (Pytest / Django Test Framework, cobrindo autenticação, migração de saldo, workflow de ciclos, contratos e governança de notificações)
- **Ferramentas e Scripts Auxiliares:** Scripts de reset de banco (`tools/database/`), servidor de e-mail mock (`tools/mail-server/dev_mail_server.py`) e orquestrador de desenvolvimento (`dev.ps1` / `dev.bat`).

---

## 2. Estrutura de Diretórios e Módulos

```text
projeto-SHM/
├── backend/
│   ├── apps/
│   │   ├── accounts/         # Autenticação, Usuários customizados, RBAC (4 papéis), Magic Login e Google OAuth
│   │   ├── clientes/         # Gestão de Clientes (PF/PJ), Magic Link de Aprovação, Auditoria Forense
│   │   ├── contratos/        # Gestão de Contratos (CT-YYYY-NNNN), Aditivos, Hashes SHA-256, Notificações de expiração, Gestão de e-mails
│   │   ├── pedidos/          # Chamados de Suporte (OSYYYYMMNNNN), Protocolo Sequencial, Anexos, Sincronização
│   │   ├── ciclos/           # Workflow de Ciclos (Orçamento, Execução, Aceite), Avaliação 1-5★, Trava de Tolerância (+30%)
│   │   ├── tarefas/          # Apontamento técnico de horas, vínculo com ciclo e recálculo atômico
│   │   ├── saldo/            # Ledger Imutável (HistoricoSaldo), Transferências entre Contratos, Reabastecimentos, Migração de Saldo
│   │   ├── comunicacao/      # Threads de Comentários, Respostas em árvore, Reações de emoji, Conversão em Tarefas
│   │   ├── notificacoes/     # Timeline de Eventos, Notificações In-App, E-mails, Configuração Declarativa e Supressão para o Autor
│   │   └── core/             # BaseModel TimeStamped, Tratamento global RFC 7807, Seed data demo
│   ├── config/               # Settings Django, URLs globais, Autenticação JWT, Swagger OpenAPI
│   └── tests/                # Suíte de testes automatizados (pytest): 8 arquivos de teste
│
├── frontend/
│   └── src/
│       ├── api/              # Cliente Axios configurado com interceptors JWT e auto-refresh
│       ├── components/       # Modais (MigracaoSaldoModal, DocumentosContratoModal, NovoContratoModal), Layout, Kanban, Ciclos
│       ├── contexts/         # AuthContext, ThemeContext, ToastContext
│       ├── pages/            # 15 Páginas SPA (Dashboard, AdminDashboard, Clientes, Contratos, ExtratoContrato, Analise, Aceite, ConfiguracoesNotificacoes, etc.)
│       └── types/            # Interfaces estritas TypeScript
│
├── tools/                    # Utilitários de desenvolvimento e teste (mail server mock, seed de banco, reset scripts)
├── docs/                     # Especificações de API, Workflow e Regras de Negócio
└── _reversa_forward/         # Histórico de evolução e features (001-trava-tolerancia-ciclos, 002-migracao-saldo-contratos, 003-nao-enviar-para-autor)
```

---

## 3. Módulos Identificados

| Módulo | Tipo | Responsabilidade Principal | Arquivos Chave |
|---|---|---|---|
| `accounts` | Backend App | Usuários customizados, 4 papéis RBAC, Magic Login tokens, Google OAuth | `models.py`, `views.py`, `serializers.py`, `urls.py` |
| `clientes` | Backend App | Cadastro PF/PJ, validações CPF/CNPJ, Magic Link de aceite cadastral, log de auditoria | `models.py`, `views.py`, `serializers.py`, `email_service.py` |
| `contratos` | Backend App | Contratos CT-YYYY-NNNN, aditivos, vigência/carência, upload com hash SHA-256, e-mails de notificação com convite/confirmação | `models.py`, `views.py`, `serializers.py`, `services.py` |
| `pedidos` | Backend App | Chamados de suporte OSYYYYMMNNNN, agrupador de ciclos, anexos, sincronização de status | `models.py`, `views.py`, `services.py` |
| `ciclos` | Backend App | Decomposição atômica, workflow de orçamento, execução, aceite, Magic Link público, avaliação de satisfação (1-5★), trava de tolerância (+30%) | `models.py`, `views.py`, `services.py` |
| `tarefas` | Backend App | Apontamento de esforço técnico (prevista/realizada), recálculo de horas do ciclo | `models.py`, `views.py`, `serializers.py` |
| `saldo` | Backend App | Ledger imutável de saldo, transferências entre contratos do mesmo cliente, reabastecimentos, migração de saldo entre contratos | `models.py`, `views.py`, `services.py` |
| `comunicacao` | Backend App | Comentários em ciclos e tarefas, respostas em árvore, reações de emoji, anexos | `models.py`, `views.py`, `serializers.py` |
| `notificacoes` | Backend App | Timeline de eventos, notificações in-app, disparos de e-mail, central declarativa de alertas, supressão de notificações para o autor da ação | `models.py`, `views.py`, `services.py`, `config_service.py` |
| `core` | Backend App | Modelos base (`TimeStampedModel`), custom exception handler RFC 7807, comando seed demo | `models.py`, `exceptions.py`, `management/commands/` |
| `frontend` | Frontend SPA | Interface web moderna em React 19, TypeScript, Tailwind CSS, TanStack Query, modais de migração, governança e matriz de destinatários | `App.tsx`, `pages/*`, `components/*`, `api/client.ts` |

---

## 4. Entry Points do Sistema

| Ponto de Entrada | Caminho | Tipo | Descrição |
|---|---|---|---|
| API Server | `backend/manage.py` | CLI / Server | Ponto de entrada do Django |
| API Root URLs | `backend/config/urls.py` | Routing | Roteamento principal das rotas `/api/v1/` e `/admin/` |
| Swagger UI | `/api/docs/` | Docs UI | Documentação interativa OpenAPI 3.0 via DRF Spectacular |
| Frontend Web App | `frontend/src/main.tsx` | UI Boot | Inicialização do React 19 com Router e QueryClient |
| Dev Scripts | `dev.ps1`, `dev.bat` | Automation | CLI unificada e inicialização concorrente de Backend + Frontend |
| Local Mail Server | `tools/mail-server/dev_mail_server.py` | Tooling | Servidor SMTP local para captura de e-mails de notificação |
| Database Reset | `tools/database/reset_db.ps1` | Tooling | Script PowerShell para reset e re-seed do banco com base limpa |

---

## 5. Arquivos de Configuração e Ambiente

- `backend/.env.example` / `backend/.env`: Configurações de banco, JWT, CORS, e-mail SMTP, Google OAuth.
- `frontend/.env.example` / `frontend/.env`: Configurações de API base URL (`VITE_API_URL`).
- `pyproject.toml` / `backend/requirements.txt`: Dependências Python gerenciadas via uv / pip.
- `frontend/package.json`: Dependências JS/TS gerenciadas via bun / npm.
- `frontend/vite.config.ts`: Configurações do bundler Vite, portas e proxy de rede.
- `frontend/tailwind.config.js`: Tokens visuais, temas claro/escuro e extensões de cor.

---

## 6. Cobertura de Testes

- **Framework de Testes Backend:** `pytest` + `pytest-django` + `factory-boy`
- **Arquivos de Teste Backend (8 suítes completas):**
  1. `test_api_endpoints.py` — Validação de endpoints da API REST
  2. `test_clientes_e_usuarios.py` — Gestão cadastral e RBAC de usuários
  3. `test_comentarios_e_permissoes.py` — Threads, comentários e regras de acesso
  4. `test_configuracoes_notificacoes.py` — Preferências declarativas, supressão de autor (in-app/e-mail) e despacho de alertas
  5. `test_contratos_features.py` — Gestão contratual avançada, hashes SHA-256, vigência e carência
  6. `test_google_auth.py` — Fluxo e validação de tokens Google OAuth
  7. `test_migracao_saldo.py` — Transferência transacional e ledger de migração de saldo
  8. `test_workflow_e_ciclos.py` — Workflow completo de orçamentação, execução e aceite de ciclos com trava de tolerância
