# Inventário do Sistema — SHM (Support Hours Manager)

> Gerado pelo **Reversa Scout** em 2026-08-27
> Versão do Sistema: **SHM 2.4 (Main Release 2.4 — Features Avaliação & Mensagens)**
> Nível de Documentação: **Completo**

---

## 1. Visão Geral da Superfície

O **SHM (Support Hours Manager)** é um sistema web fullstack para governança, controle de horas técnicas, gestão contratual, decomposição em ciclos atômicos, ledger imutável de saldo e aprovações via Magic Links.

### Resumo Quantitativo
- **Linguagem Principal Backend:** Python (Django 5.2 + Django REST Framework)
- **Linguagem Principal Frontend:** TypeScript / React 19 (Vite + Tailwind CSS)
- **Total de Módulos Backend (Apps Django):** 10 apps (accounts, clientes, contratos, pedidos, ciclos, tarefas, saldo, comunicacao, notificacoes, core)
- **Total de Páginas Frontend:** 14 páginas React SPA
- **Bancos de Dados:** SQLite (desenvolvimento / demo) e PostgreSQL (produção)
- **Testes Automatizados:** 7 arquivos de teste no backend (Pytest / Django Test Framework)

---

## 2. Estrutura de Diretórios e Módulos

```
projeto-SHM/
├── backend/
│   ├── apps/
│   │   ├── accounts/         # Autenticação, Usuários customizados, RBAC, Magic Login e Google OAuth
│   │   ├── clientes/         # Gestão de Clientes (PF/PJ), Magic Link de Aprovação, Auditoria Forense
│   │   ├── contratos/        # Gestão de Contratos (CT-YYYY-NNNN), Aditivos, Documentos com SHA-256, Notificações
│   │   ├── pedidos/          # Chamados de Suporte (OSYYYYMMNNNN), Protocolo Sequencial, Anexos
│   │   ├── ciclos/           # Workflow de Ciclos (Orçamento, Execução, Aceite), Avaliação de Ciclo (1-5★)
│   │   ├── tarefas/          # Apontamento técnico de horas, vínculo com ciclo e recálculo automático
│   │   ├── saldo/            # Ledger Imutável (HistoricoSaldo), Transferências entre Contratos, Reabastecimentos
│   │   ├── comunicacao/      # Threads de Comentários, Respostas aninhadas, Reações (emojis), Conversão em Tarefas
│   │   ├── notificacoes/     # Timeline de Eventos do Pedido/Ciclo, Notificações in-app, E-mails
│   │   └── core/             # BaseModel TimeStamped, Tratamento global de exceções, Seed data demo
│   ├── config/               # Settings Django, URLs globais, Autenticação JWT, Swagger OpenAPI
│   └── tests/                # Suíte de testes automatizados (pytest)
│
├── frontend/
│   └── src/
│       ├── api/              # Cliente Axios configurado com interceptors JWT e auto-refresh
│       ├── components/       # Layout (Header, Sidebar, Navigation), Modais, Kanban, Ciclos, Comentários
│       ├── contexts/         # AuthContext, ThemeContext, Notificações
│       ├── pages/            # 14 Páginas SPA (Dashboard, Clientes, Contratos, Extrato, Analise, Aceite, etc.)
│       └── types/            # Interfaces estritas TypeScript
│
├── docs/                     # Especificações de API, Workflow e Regras de Negócio
└── relatorio-legado/         # Dossiê forense e histórico de extração do legado
```

---

## 3. Módulos Identificados

| Módulo | Tipo | Responsabilidade Principal | Arquivos Chave |
|---|---|---|---|
| accounts | Backend App | Usuários customizados, 4 papéis RBAC, Magic Login tokens, Google OAuth | models.py, views.py, serializers.py, urls.py |
| clientes | Backend App | Cadastro PF/PJ, validações CPF/CNPJ, Magic Link de aceite cadastral, log de auditoria | models.py, views.py, serializers.py, email_service.py |
| contratos | Backend App | Contratos CT-YYYY-NNNN, aditivos, vigência/carência, upload com hash SHA-256, e-mails de notificação com convite/confirmação | models.py, views.py, serializers.py |
| pedidos | Backend App | Chamados de suporte OSYYYYMMNNNN, agrupador de ciclos, anexos, sincronização de status | models.py, views.py, services.py |
| ciclos | Backend App | Decomposição atômica, workflow de orçamento, execução, aceite, Magic Link público, avaliação de satisfação (1-5★) | models.py, views.py, services.py |
| tarefas | Backend App | Apontamento de esforço técnico (prevista/realizada), recálculo de horas do ciclo | models.py, views.py, serializers.py |
| saldo | Backend App | Ledger imutável de saldo, transferências entre contratos do mesmo cliente, reabastecimentos | models.py, views.py, services.py |
| comunicacao | Backend App | Comentários em ciclos e tarefas, respostas em árvore, reações de emoji, anexos | models.py, views.py, serializers.py |
| notificacoes | Backend App | Timeline de eventos, notificações in-app, disparos de e-mail | models.py, views.py, services.py |
| core | Backend App | Modelos base (TimeStampedModel), custom exception handler, comando seed demo | models.py, exceptions.py, management/commands/ |
| frontend | Frontend SPA | Interface web moderna em React 19, TypeScript, Tailwind CSS, TanStack Query | App.tsx, pages/*, components/*, api/client.ts |

---

## 4. Entry Points do Sistema

| Ponto de Entrada | Caminho | Tipo | Descrição |
|---|---|---|---|
| API Server | backend/manage.py | CLI / Server | Ponto de entrada do Django |
| API Root URLs | backend/config/urls.py | Routing | Roteamento principal das rotas /api/v1/ e /admin/ |
| Swagger UI | /api/docs/ | Docs UI | Documentação interativa OpenAPI 3.0 via DRF Spectacular |
| Frontend Web App | frontend/src/main.tsx | UI Boot | Inicialização do React 19 com Router e QueryClient |
| Dev Scripts | start-dev.bat, start-dev.ps1 | Automation | Inicialização concorrente de Backend + Frontend |

---

## 5. Arquivos de Configuração e Ambiente

- backend/.env.example / backend/.env: Configurações de banco, JWT, CORS, e-mail SMTP, Google OAuth.
- frontend/.env.example / frontend/.env: Configurações de API base URL (VITE_API_URL).
- pyproject.toml / backend/requirements.txt: Dependências Python gerenciadas via uv / pip.
- frontend/package.json / frontend/bun.lock: Dependências JS/TS gerenciadas via bun / npm.
- frontend/vite.config.ts: Configurações do bundler Vite, portas e proxy de rede.
- frontend/tailwind.config.js: Tokens visuais, temas claro/escuro e extensões de cor.

---

## 6. Cobertura de Testes

- **Framework de Testes Backend:** pytest + pytest-django
- **Arquivos de Teste Backend:**
  1. backend/tests/test_api_endpoints.py
  2. backend/tests/test_clientes_e_usuarios.py
  3. backend/tests/test_comentarios_e_permissoes.py
  4. backend/tests/test_contratos_features.py
  5. backend/tests/test_google_auth.py
  6. backend/tests/test_workflow_e_ciclos.py
- **Frontend:** Verificação de tipagem estrita com tsc e build via vite build.
