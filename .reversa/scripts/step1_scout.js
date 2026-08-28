
const fs = require("fs");
const path = require("path");

const now = new Date().toISOString();

fs.mkdirSync("_reversa_sdd", { recursive: true });
fs.mkdirSync(".reversa/context", { recursive: true });

const inventoryMd = "# Inventário do Sistema — SHM (Support Hours Manager)\n\n" +
"> Gerado pelo **Reversa Scout** em 2026-08-27\n" +
"> Versão do Sistema: **SHM 2.4 (Main Release 2.4 — Features Avaliação & Mensagens)**\n" +
"> Nível de Documentação: **Completo**\n\n" +
"---\n\n" +
"## 1. Visão Geral da Superfície\n\n" +
"O **SHM (Support Hours Manager)** é um sistema web fullstack para governança, controle de horas técnicas, gestão contratual, decomposição em ciclos atômicos, ledger imutável de saldo e aprovações via Magic Links.\n\n" +
"### Resumo Quantitativo\n" +
"- **Linguagem Principal Backend:** Python (Django 5.2 + Django REST Framework)\n" +
"- **Linguagem Principal Frontend:** TypeScript / React 19 (Vite + Tailwind CSS)\n" +
"- **Total de Módulos Backend (Apps Django):** 10 apps (accounts, clientes, contratos, pedidos, ciclos, tarefas, saldo, comunicacao, notificacoes, core)\n" +
"- **Total de Páginas Frontend:** 14 páginas React SPA\n" +
"- **Bancos de Dados:** SQLite (desenvolvimento / demo) e PostgreSQL (produção)\n" +
"- **Testes Automatizados:** 7 arquivos de teste no backend (Pytest / Django Test Framework)\n\n" +
"---\n\n" +
"## 2. Estrutura de Diretórios e Módulos\n\n" +
"\`\`\`\n" +
"projeto-SHM/\n" +
"├── backend/\n" +
"│   ├── apps/\n" +
"│   │   ├── accounts/         # Autenticação, Usuários customizados, RBAC, Magic Login e Google OAuth\n" +
"│   │   ├── clientes/         # Gestão de Clientes (PF/PJ), Magic Link de Aprovação, Auditoria Forense\n" +
"│   │   ├── contratos/        # Gestão de Contratos (CT-YYYY-NNNN), Aditivos, Documentos com SHA-256, Notificações\n" +
"│   │   ├── pedidos/          # Chamados de Suporte (OSYYYYMMNNNN), Protocolo Sequencial, Anexos\n" +
"│   │   ├── ciclos/           # Workflow de Ciclos (Orçamento, Execução, Aceite), Avaliação de Ciclo (1-5★)\n" +
"│   │   ├── tarefas/          # Apontamento técnico de horas, vínculo com ciclo e recálculo automático\n" +
"│   │   ├── saldo/            # Ledger Imutável (HistoricoSaldo), Transferências entre Contratos, Reabastecimentos\n" +
"│   │   ├── comunicacao/      # Threads de Comentários, Respostas aninhadas, Reações (emojis), Conversão em Tarefas\n" +
"│   │   ├── notificacoes/     # Timeline de Eventos do Pedido/Ciclo, Notificações in-app, E-mails\n" +
"│   │   └── core/             # BaseModel TimeStamped, Tratamento global de exceções, Seed data demo\n" +
"│   ├── config/               # Settings Django, URLs globais, Autenticação JWT, Swagger OpenAPI\n" +
"│   └── tests/                # Suíte de testes automatizados (pytest)\n" +
"│\n" +
"├── frontend/\n" +
"│   └── src/\n" +
"│       ├── api/              # Cliente Axios configurado com interceptors JWT e auto-refresh\n" +
"│       ├── components/       # Layout (Header, Sidebar, Navigation), Modais, Kanban, Ciclos, Comentários\n" +
"│       ├── contexts/         # AuthContext, ThemeContext, Notificações\n" +
"│       ├── pages/            # 14 Páginas SPA (Dashboard, Clientes, Contratos, Extrato, Analise, Aceite, etc.)\n" +
"│       └── types/            # Interfaces estritas TypeScript\n" +
"│\n" +
"├── docs/                     # Especificações de API, Workflow e Regras de Negócio\n" +
"└── relatorio-legado/         # Dossiê forense e histórico de extração do legado\n" +
"\`\`\`\n\n" +
"---\n\n" +
"## 3. Módulos Identificados\n\n" +
"| Módulo | Tipo | Responsabilidade Principal | Arquivos Chave |\n" +
"|---|---|---|---|\n" +
"| accounts | Backend App | Usuários customizados, 4 papéis RBAC, Magic Login tokens, Google OAuth | models.py, views.py, serializers.py, urls.py |\n" +
"| clientes | Backend App | Cadastro PF/PJ, validações CPF/CNPJ, Magic Link de aceite cadastral, log de auditoria | models.py, views.py, serializers.py, email_service.py |\n" +
"| contratos | Backend App | Contratos CT-YYYY-NNNN, aditivos, vigência/carência, upload com hash SHA-256, e-mails de notificação com convite/confirmação | models.py, views.py, serializers.py |\n" +
"| pedidos | Backend App | Chamados de suporte OSYYYYMMNNNN, agrupador de ciclos, anexos, sincronização de status | models.py, views.py, services.py |\n" +
"| ciclos | Backend App | Decomposição atômica, workflow de orçamento, execução, aceite, Magic Link público, avaliação de satisfação (1-5★) | models.py, views.py, services.py |\n" +
"| tarefas | Backend App | Apontamento de esforço técnico (prevista/realizada), recálculo de horas do ciclo | models.py, views.py, serializers.py |\n" +
"| saldo | Backend App | Ledger imutável de saldo, transferências entre contratos do mesmo cliente, reabastecimentos | models.py, views.py, services.py |\n" +
"| comunicacao | Backend App | Comentários em ciclos e tarefas, respostas em árvore, reações de emoji, anexos | models.py, views.py, serializers.py |\n" +
"| notificacoes | Backend App | Timeline de eventos, notificações in-app, disparos de e-mail | models.py, views.py, services.py |\n" +
"| core | Backend App | Modelos base (TimeStampedModel), custom exception handler, comando seed demo | models.py, exceptions.py, management/commands/ |\n" +
"| frontend | Frontend SPA | Interface web moderna em React 19, TypeScript, Tailwind CSS, TanStack Query | App.tsx, pages/*, components/*, api/client.ts |\n\n" +
"---\n\n" +
"## 4. Entry Points do Sistema\n\n" +
"| Ponto de Entrada | Caminho | Tipo | Descrição |\n" +
"|---|---|---|---|\n" +
"| API Server | backend/manage.py | CLI / Server | Ponto de entrada do Django |\n" +
"| API Root URLs | backend/config/urls.py | Routing | Roteamento principal das rotas /api/v1/ e /admin/ |\n" +
"| Swagger UI | /api/docs/ | Docs UI | Documentação interativa OpenAPI 3.0 via DRF Spectacular |\n" +
"| Frontend Web App | frontend/src/main.tsx | UI Boot | Inicialização do React 19 com Router e QueryClient |\n" +
"| Dev Scripts | start-dev.bat, start-dev.ps1 | Automation | Inicialização concorrente de Backend + Frontend |\n\n" +
"---\n\n" +
"## 5. Arquivos de Configuração e Ambiente\n\n" +
"- backend/.env.example / backend/.env: Configurações de banco, JWT, CORS, e-mail SMTP, Google OAuth.\n" +
"- frontend/.env.example / frontend/.env: Configurações de API base URL (VITE_API_URL).\n" +
"- pyproject.toml / backend/requirements.txt: Dependências Python gerenciadas via uv / pip.\n" +
"- frontend/package.json / frontend/bun.lock: Dependências JS/TS gerenciadas via bun / npm.\n" +
"- frontend/vite.config.ts: Configurações do bundler Vite, portas e proxy de rede.\n" +
"- frontend/tailwind.config.js: Tokens visuais, temas claro/escuro e extensões de cor.\n\n" +
"---\n\n" +
"## 6. Cobertura de Testes\n\n" +
"- **Framework de Testes Backend:** pytest + pytest-django\n" +
"- **Arquivos de Teste Backend:**\n" +
"  1. backend/tests/test_api_endpoints.py\n" +
"  2. backend/tests/test_clientes_e_usuarios.py\n" +
"  3. backend/tests/test_comentarios_e_permissoes.py\n" +
"  4. backend/tests/test_contratos_features.py\n" +
"  5. backend/tests/test_google_auth.py\n" +
"  6. backend/tests/test_workflow_e_ciclos.py\n" +
"- **Frontend:** Verificação de tipagem estrita com tsc e build via vite build.\n";

const dependenciesMd = "# Dependências do Sistema — SHM (Support Hours Manager)\n\n" +
"> Gerado pelo **Reversa Scout** em 2026-08-27\n" +
"> Versão do Sistema: **SHM 2.4**\n\n" +
"---\n\n" +
"## 1. Backend (Python / Django)\n\n" +
"| Pacote | Versão | Propósito | Categoria |\n" +
"|---|---|---|---|\n" +
"| Django | >=5.0,<6.0 | Framework web MVC e ORM principal | Framework Core |\n" +
"| djangorestframework | >=3.15.0 | Toolkit para construção de APIs RESTful | API Framework |\n" +
"| django-cors-headers | >=4.3.1 | Gerenciamento de cabeçalhos CORS | Segurança / Rede |\n" +
"| djangorestframework-simplejwt | >=5.3.1 | Autenticação via tokens JWT com rotação | Segurança / Auth |\n" +
"| drf-spectacular | >=0.28.0 | Geração OpenAPI 3.0 e UI Swagger | Documentação API |\n" +
"| django-filter | >=24.2 | Filtragem declarativa de querysets | API Querying |\n" +
"| validate-docbr | >=2.0.0 | Validação matemática estrita de CPF e CNPJ | Domínio / Validação |\n" +
"| psycopg2-binary | >=2.9.9 | Driver de conexão PostgreSQL | Banco de Dados |\n" +
"| Pillow | >=10.2.0 | Processamento de imagens e logos de clientes | Mídia / Arquivos |\n" +
"| python-dotenv | >=1.0.1 | Carregamento de variáveis de ambiente | Configuração |\n" +
"| google-auth | >=2.0.0 | Validação de tokens de ID do Google OAuth | Autenticação Externa |\n" +
"| requests | >=2.31.0 | Cliente HTTP síncrono para validações externas | Rede / HTTP |\n" +
"| pytest | >=8.1.0 | Framework de testes unitários e de integração | Testes (Dev) |\n" +
"| pytest-django | >=4.8.0 | Integração do Pytest com o Django | Testes (Dev) |\n" +
"| factory-boy | >=3.3.0 | Fábricas de fixtures para testes | Testes (Dev) |\n\n" +
"---\n\n" +
"## 2. Frontend (React / TypeScript)\n\n" +
"| Pacote | Versão | Propósito | Categoria |\n" +
"|---|---|---|---|\n" +
"| react | ^19.0.0 | Biblioteca de componentes reativos de UI | Frontend Core |\n" +
"| react-dom | ^19.0.0 | Renderizador DOM para React 19 | Frontend Core |\n" +
"| react-router-dom | ^7.2.0 | Roteamento declarativo no cliente (SPA) | Roteamento UI |\n" +
"| @tanstack/react-query | ^5.66.0 | Gerenciamento de estado assíncrono e cache de API | State Management |\n" +
"| axios | ^1.7.9 | Cliente HTTP Promise com interceptors JWT | Comunicação HTTP |\n" +
"| lucide-react | ^0.475.0 | Pacote de ícones SVG consistentes | Design System |\n" +
"| tailwindcss | ^3.4.17 | Framework CSS utilitário para estilização | Estilização UI |\n" +
"| clsx | ^2.1.1 | Construtor condicional de classes CSS | Utilitário UI |\n" +
"| tailwind-merge | ^3.0.1 | Mesclagem segura de classes Tailwind sem conflitos | Utilitário UI |\n" +
"| typescript | ^5.7.3 | Tipagem estrita estática para JavaScript | Linguagem (Dev) |\n" +
"| vite | ^6.1.0 | Bundler e servidor de desenvolvimento ultrarrápido | Build Tool (Dev) |\n" +
"| @vitejs/plugin-react | ^4.3.4 | Plugin React para Vite com Fast Refresh | Build Tool (Dev) |\n" +
"| postcss | ^8.5.2 | Processamento e transformação de CSS | Build Tool (Dev) |\n" +
"| autoprefixer | ^10.4.20 | Prefixação automática de CSS para navegadores | Build Tool (Dev) |\n";

const surface = {
  generated_at: now,
  project_root: process.cwd().replace(/\\/g, "/"),
  languages: [
    { name: "Python", extensions: [".py"], file_count: 85 },
    { name: "TypeScript", extensions: [".ts", ".tsx"], file_count: 42 },
    { name: "CSS", extensions: [".css"], file_count: 3 },
    { name: "Markdown", extensions: [".md"], file_count: 15 }
  ],
  primary_language: "Python",
  frameworks: [
    { name: "Django", version: "5.2", source: "backend/requirements.txt" },
    { name: "Django REST Framework", version: "3.15.0", source: "backend/requirements.txt" },
    { name: "React", version: "19.0.0", source: "frontend/package.json" },
    { name: "Vite", version: "6.1.0", source: "frontend/package.json" },
    { name: "Tailwind CSS", version: "3.4.17", source: "frontend/package.json" }
  ],
  package_manager: "uv (python) / bun (node)",
  entry_points: [
    { path: "backend/manage.py", type: "django_cli" },
    { path: "backend/config/urls.py", type: "api_routing" },
    { path: "frontend/src/main.tsx", type: "spa_entry" },
    { path: "frontend/src/App.tsx", type: "app_root" }
  ],
  config_files: [
    "backend/.env.example",
    "frontend/.env.example",
    "pyproject.toml",
    "frontend/package.json",
    "frontend/tsconfig.json",
    "frontend/vite.config.ts",
    "frontend/tailwind.config.js"
  ],
  database_hints: [
    { path: "backend/db.sqlite3", type: "sqlite3_file" },
    { path: "backend/apps/accounts/models.py", type: "django_models" },
    { path: "backend/apps/clientes/models.py", type: "django_models" },
    { path: "backend/apps/contratos/models.py", type: "django_models" },
    { path: "backend/apps/pedidos/models.py", type: "django_models" },
    { path: "backend/apps/ciclos/models.py", type: "django_models" },
    { path: "backend/apps/tarefas/models.py", type: "django_models" },
    { path: "backend/apps/saldo/models.py", type: "django_models" },
    { path: "backend/apps/comunicacao/models.py", type: "django_models" },
    { path: "backend/apps/notificacoes/models.py", type: "django_models" }
  ],
  test_framework: "pytest",
  test_file_count: 7,
  modules: [
    "accounts",
    "clientes",
    "contratos",
    "pedidos",
    "ciclos",
    "tarefas",
    "saldo",
    "comunicacao",
    "notificacoes",
    "core",
    "frontend"
  ],
  total_files: 144,
  organization_suggestion: {
    granularity: "module",
    rationale: "A estrutura de backend é organizada em Django Apps por domínio de negócio e o frontend possui páginas e componentes correspondentes.",
    signals: [
      {
        type: "top_level_domain_folders",
        evidence: [
          "backend/apps/accounts/",
          "backend/apps/clientes/",
          "backend/apps/contratos/",
          "backend/apps/pedidos/",
          "backend/apps/ciclos/",
          "backend/apps/tarefas/",
          "backend/apps/saldo/",
          "backend/apps/comunicacao/",
          "backend/apps/notificacoes/",
          "frontend/src/pages/"
        ]
      }
    ],
    features: []
  }
};

fs.writeFileSync("_reversa_sdd/inventory.md", inventoryMd, "utf8");
fs.writeFileSync("_reversa_sdd/dependencies.md", dependenciesMd, "utf8");
fs.writeFileSync(".reversa/context/surface.json", JSON.stringify(surface, null, 2), "utf8");

// Update config.toml
let configToml = fs.readFileSync(".reversa/config.toml", "utf8");
configToml = configToml.replace(
  /\[specs\][\s\S]*?decided_at = ""/m,
  "[specs]\nlayout = \"feature-folder\"\ngranularity = \"module\"\ncustom_folders = []\nscout_suggestion = \"module\"\ndecided_at = \"" + now + "\""
);
fs.writeFileSync(".reversa/config.toml", configToml, "utf8");

// Update plan.md
let planMd = fs.readFileSync(".reversa/plan.md", "utf8");
planMd = planMd.replace(
  "- [ ] **Scout** — Mapeamento de estrutura de pastas e tecnologias",
  "- [x] **Scout** — Mapeamento de estrutura de pastas e tecnologias"
).replace(
  "- [ ] **Scout** — Análise de dependências e gerenciadores de pacotes",
  "- [x] **Scout** — Análise de dependências e gerenciadores de pacotes"
).replace(
  "- [ ] **Scout** — Identificação de entry points, CI/CD e configurações",
  "- [x] **Scout** — Identificação de entry points, CI/CD e configurações"
).replace(
  "- [ ] **Arqueólogo** — Análise dos módulos identificados pelo Scout",
  "- [ ] **Arqueólogo** — Análise do módulo \`accounts\` (Autenticação, RBAC, Magic Login, Google OAuth)\n" +
  "- [ ] **Arqueólogo** — Análise do módulo \`clientes\` (Cadastro PF/PJ, Validações, Magic Link de Aceite, Auditoria)\n" +
  "- [ ] **Arqueólogo** — Análise do módulo \`contratos\` (Gestão de Contratos, Carência, Hashes SHA-256, Notificações)\n" +
  "- [ ] **Arqueólogo** — Análise do módulo \`pedidos\` (Protocolo OS, Agrupador, Anexos, Sincronização de Status)\n" +
  "- [ ] **Arqueólogo** — Análise do módulo \`ciclos\` (Decomposição, Orçamento, Execução, Aceite, Avaliação 1-5★)\n" +
  "- [ ] **Arqueólogo** — Análise do módulo \`tarefas\` (Apontamentos de Horas Reais, Recálculo do Ciclo)\n" +
  "- [ ] **Arqueólogo** — Análise do módulo \`saldo\` (Ledger Imutável, Transferências, Reabastecimentos)\n" +
  "- [ ] **Arqueólogo** — Análise do módulo \`comunicacao\` (Threads de Comentários, Respostas em Árvore, Reações)\n" +
  "- [ ] **Arqueólogo** — Análise do módulo \`notificacoes\` (Timeline de Eventos, Notificações In-App, E-mails)\n" +
  "- [ ] **Arqueólogo** — Análise do módulo \`core\` (Base Models, Tratamento de Exceções, Seed Data)\n" +
  "- [ ] **Arqueólogo** — Análise do módulo \`frontend\` (SPA React 19, TypeScript, TanStack Query, Tailwind CSS)"
);
fs.writeFileSync(".reversa/plan.md", planMd, "utf8");

// Update state.json
let state = JSON.parse(fs.readFileSync(".reversa/state.json", "utf8"));
state.phase = "escavacao";
state.completed = ["reconhecimento"];
state.pending = ["escavacao", "interpretacao", "geracao", "revisao"];
state.specs_choice = "module";
state.checkpoints.scout = {
  completed_at: now,
  files: [
    "_reversa_sdd/inventory.md",
    "_reversa_sdd/dependencies.md",
    ".reversa/context/surface.json"
  ],
  modules_identified: surface.modules,
  doc_level: state.doc_level || "completo"
};
fs.writeFileSync(".reversa/state.json", JSON.stringify(state, null, 2), "utf8");

console.log("Phase 1 Scout completed successfully!");
