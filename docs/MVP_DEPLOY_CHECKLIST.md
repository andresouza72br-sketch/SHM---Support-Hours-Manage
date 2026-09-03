# MVP Deploy Checklist — SHM 2.3

> **Ambiente:** MVP / Produção Simulada (SQLite)  
> **Data:** ___________  
> **Responsável:** ___________  
> **Versão deployada:** 2.3 Pre-RC — commit `_____________`

Use este checklist antes de **cada deploy** para o ambiente MVP. Marque cada item após conclusão.  
Qualquer item não marcado deve ser documentado com justificativa antes do go-live.

---

## 1. Configuração de Segurança

> ⚠️ **Todos os itens desta seção são bloqueantes.** Deploy não deve prosseguir com qualquer item pendente.

### 1.1 Variáveis de Ambiente

- [ ] **`SECRET_KEY`** única e aleatória gerada para este ambiente
  ```bash
  python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
  ```
  - [ ] Valor **NÃO** está hardcoded no código ou versionado no repositório
  - [ ] Valor está definido como variável de ambiente ou em arquivo `.env` fora do repositório

- [ ] **`DEBUG=False`** confirmado no ambiente de deploy
  ```bash
  # Verificar no settings ou variável de ambiente
  echo $DEBUG   # deve retornar False ou estar ausente
  ```

- [ ] **`ALLOWED_HOSTS`** configurado com o(s) domínio(s)/IP(s) correto(s)
  ```python
  # Exemplo:
  ALLOWED_HOSTS = ["shm.suaempresa.com.br", "192.168.1.100"]
  ```
  - [ ] Wildcard `*` **não** está sendo usado em produção

- [ ] **`CORS_ALLOWED_ORIGINS`** configurado com a URL exata do frontend
  ```python
  # Exemplo:
  CORS_ALLOWED_ORIGINS = ["https://shm.suaempresa.com.br"]
  ```
  - [ ] `CORS_ALLOW_ALL_ORIGINS = True` **não** está ativo

- [ ] **`FRONTEND_URL`** configurado com a URL de produção correta
  - Usado na geração dos Magic Links enviados por e-mail
  ```python
  FRONTEND_URL = "https://shm.suaempresa.com.br"
  ```

### 1.2 Logs

- [ ] Configuração de logging definida (escolha uma opção):
  - [ ] **Opção A — Arquivo**: `LOGGING` configurado com `FileHandler` apontando para caminho com permissão de escrita
  - [ ] **Opção B — Stdout**: `LOGGING` configurado com `StreamHandler` (adequado para containers/PaaS)
  - [ ] Nível mínimo de log: `WARNING` em produção, `DEBUG` apenas em desenvolvimento

---

## 2. Banco de Dados

### 2.1 Backup

- [ ] **Backup do `db.sqlite3` realizado** antes de aplicar qualquer migração
  ```bash
  cp backend/db.sqlite3 backups/db.sqlite3.bak-$(date +%Y%m%d-%H%M%S)
  ```
  - [ ] Arquivo de backup verificado (não está corrompido / tamanho > 0 bytes)

### 2.2 Migrations

- [ ] Verificar se há migrations pendentes não geradas:
  ```bash
  python manage.py makemigrations --check --dry-run
  ```
  - [ ] Saída confirma que **não há** migrations pendentes (ou novas foram geradas intencionalmente)

- [ ] Aplicar todas as migrations:
  ```bash
  python manage.py migrate
  ```
  - [ ] Comando executado sem erros
  - [ ] Todas as migrations estão marcadas como `[X]` aplicadas:
    ```bash
    python manage.py showmigrations
    ```

### 2.3 Dados Iniciais

- [ ] **Superuser** criado (se ambiente novo):
  ```bash
  python manage.py createsuperuser
  ```

- [ ] **Usuários demo** criados para smoke tests:

  | Usuário | Papel | Status |
  |---------|-------|--------|
  | `admin` | `EMPRESA_ADMIN` | [ ] Criado |
  | `tecnico` | `EMPRESA_TECNICO` | [ ] Criado |
  | `gerente.acme` | `CLIENTE_GERENTE` | [ ] Criado |
  | `analista.acme` | `CLIENTE_ANALISTA` | [ ] Criado |

  - [ ] Usuários de cliente (`gerente.acme`, `analista.acme`) vinculados ao cliente/contrato de demonstração correto

---

## 3. Frontend

### 3.1 Build

- [ ] Dependências instaladas:
  ```bash
  cd frontend
  bun install
  ```

- [ ] Build de produção gerado sem erros:
  ```bash
  bun run build
  ```
  - [ ] Diretório `dist/` gerado com arquivos estáticos
  - [ ] Sem warnings críticos no output do build (TypeScript errors, imports faltando)

### 3.2 Variáveis de Ambiente do Frontend

- [ ] Arquivo `.env.production` configurado com a URL correta da API:
  ```env
  VITE_API_BASE_URL=https://shm.suaempresa.com.br/api
  ```
  - [ ] URL **não** aponta para `localhost` em produção

### 3.3 Arquivos Estáticos

- [ ] **`collectstatic`** executado para consolidar estáticos do Django Admin e DRF:
  ```bash
  python manage.py collectstatic --no-input
  ```
  - [ ] Arquivos coletados no diretório `STATIC_ROOT` configurado

- [ ] Servidor web (Nginx / WhiteNoise / outro) configurado para servir:
  - [ ] `STATIC_ROOT` → `/static/`
  - [ ] `MEDIA_ROOT` → `/media/`

- [ ] Verificar acesso a um arquivo estático de teste:
  ```bash
  curl -I https://shm.suaempresa.com.br/static/admin/css/base.css
  # Esperado: HTTP 200
  ```

- [ ] Verificar que o diretório `media/` está acessível (para downloads de documentos de contrato):
  ```bash
  curl -I https://shm.suaempresa.com.br/media/
  # Esperado: HTTP 200 ou 403 (não 404 / 500)
  ```

---

## 4. E-mail / Notificações

> **Para MVP**, o backend de e-mail pode operar em modo `console` (logs no terminal). Para produção real, configurar SMTP.

### 4.1 Backend de E-mail

- [ ] Escolha e configure uma das opções:

  **Opção A — Console (MVP/Desenvolvimento):**
  ```python
  EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
  ```

  **Opção B — SMTP (Produção):**
  ```python
  EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
  EMAIL_HOST = "smtp.suaprovedor.com"
  EMAIL_PORT = 587
  EMAIL_USE_TLS = True
  EMAIL_HOST_USER = "no-reply@suaempresa.com.br"
  EMAIL_HOST_PASSWORD = "<senha via variável de ambiente>"
  DEFAULT_FROM_EMAIL = "SHM <no-reply@suaempresa.com.br>"
  ```
  - [ ] Credenciais SMTP **não** versionadas no repositório

### 4.2 Teste de Envio

- [ ] Enviar e-mail de teste para validar configuração:
  ```bash
  python manage.py shell -c "
  from django.core.mail import send_mail
  send_mail('Teste SHM', 'Deploy OK', 'no-reply@shm.local', ['seu@email.com'])
  "
  ```
  - [ ] E-mail recebido (SMTP) **ou** mensagem exibida no console (modo console)

### 4.3 Magic Links

- [ ] Confirmar que a geração de Magic Links usa `FRONTEND_URL` (não `localhost`)
- [ ] Testar geração de Magic Link para um ciclo de exemplo e verificar URL no e-mail/console

---

## 5. Testes & Verificação

### 5.1 Backend Tests

- [ ] Executar suíte completa de testes:
  ```bash
  cd backend
  pytest tests/ -v
  ```
  - [ ] **37/37 testes passando** (ou número atualizado confirmado)
  - [ ] Zero falhas, zero erros

- [ ] Verificar cobertura mínima (opcional mas recomendado):
  ```bash
  pytest tests/ --cov=. --cov-report=term-missing
  ```

### 5.2 Verificação de Configurações Django

- [ ] Executar check de sistema Django:
  ```bash
  python manage.py check --deploy
  ```
  - [ ] Nenhum `CRITICAL` ou `ERROR` no output
  - [ ] Warnings documentados e aceitos conscientemente

### 5.3 Verificação de API

- [ ] Endpoint raiz da API responde:
  ```bash
  curl https://shm.suaempresa.com.br/api/
  # Esperado: HTTP 200 com JSON de rotas disponíveis
  ```

- [ ] Endpoint de autenticação responde:
  ```bash
  curl -X POST https://shm.suaempresa.com.br/api/auth/token/ \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "<senha>"}'
  # Esperado: HTTP 200 com access/refresh tokens
  ```

---

## 6. Smoke Tests Manuais

> Executar com os usuários demo criados na seção 2.3. Registrar resultado de cada teste.

### 6.1 Perfil: `EMPRESA_ADMIN` (`admin`)

| # | Ação | Resultado Esperado | ✅/❌ | Observações |
|---|------|--------------------|------|-------------|
| 1 | Login na aplicação | Autenticação bem-sucedida, dashboard carregado | | |
| 2 | Criar cliente `Acme Corp` (se não existir) | Cliente criado, visível na lista | | |
| 3 | Criar contrato `CT-2026-0001` para `Acme Corp` com 100h de saldo | Contrato criado com saldo = 100h | | |
| 4 | Criar usuários `gerente.acme` e `analista.acme` vinculados à `Acme Corp` | Usuários criados com papéis corretos | | |
| 5 | Visualizar `HistoricoSaldo` do contrato `CT-2026-0001` | Histórico vazio (nenhum débito ainda) | | |
| 6 | Acessar Django Admin (`/admin/`) | Admin carregado com todos os apps | | |

### 6.2 Perfil: `EMPRESA_TECNICO` (`tecnico`)

| # | Ação | Resultado Esperado | ✅/❌ | Observações |
|---|------|--------------------|------|-------------|
| 1 | Login na aplicação | Autenticação bem-sucedida | | |
| 2 | Criar pedido `OS202608` no contrato `CT-2026-0001` | Pedido criado, status inicial correto | | |
| 3 | Criar ciclo `Ciclo 01` no pedido com orçamento de 10h | Ciclo criado no estado `orcado` | | |
| 4 | Submeter ciclo para aprovação | Estado muda para `aguardando_aprovacao`; e-mail/Magic Link gerado | | |
| 5 | Verificar que técnico **não consegue** aprovar o próprio ciclo | Ação bloqueada / botão ausente | | |

### 6.3 Perfil: `CLIENTE_GERENTE` (`gerente.acme`)

| # | Ação | Resultado Esperado | ✅/❌ | Observações |
|---|------|--------------------|------|-------------|
| 1 | Login na aplicação | Autenticação bem-sucedida, vê apenas dados de `Acme Corp` | | |
| 2 | Aprovar `Ciclo 01` via interface web | Estado muda para `aprovado`; `ip_origem` e `user_agent` registrados | | |
| 3 | Verificar que **não vê** dados de outros clientes | Nenhum dado de outros clientes visível | | |
| 4 | Clicar no Magic Link recebido por e-mail (para outro ciclo de teste) | Aprovação via Magic Link bem-sucedida; token invalidado | | |
| 5 | Tentar usar o mesmo Magic Link novamente | Erro `token inválido` ou `token já utilizado` | | |

### 6.4 Perfil: `EMPRESA_TECNICO` (`tecnico`) — Continuação pós-aprovação

| # | Ação | Resultado Esperado | ✅/❌ | Observações |
|---|------|--------------------|------|-------------|
| 1 | Iniciar execução do `Ciclo 01` (aprovado) | Estado muda para `em_execucao` | | |
| 2 | Registrar tarefa com 8h lançadas | Tarefa criada, horas registradas | | |
| 3 | Submeter ciclo para aceite | Estado muda para `aguardando_aceite` | | |

### 6.5 Perfil: `CLIENTE_GERENTE` (`gerente.acme`) — Aceite Formal

| # | Ação | Resultado Esperado | ✅/❌ | Observações |
|---|------|--------------------|------|-------------|
| 1 | Realizar Aceite Formal do `Ciclo 01` | Estado muda para `aceito` | | |
| 2 | Verificar `HistoricoSaldo` do contrato | Novo registro de débito: -8h; saldo agora = 92h | | |
| 3 | Avaliar o ciclo concluído (1-5 estrelas) | Avaliação salva e visível | | |

### 6.6 Perfil: `CLIENTE_ANALISTA` (`analista.acme`)

| # | Ação | Resultado Esperado | ✅/❌ | Observações |
|---|------|--------------------|------|-------------|
| 1 | Login na aplicação | Autenticação bem-sucedida | | |
| 2 | Visualizar ciclos e tarefas do contrato | Dados visíveis em modo somente leitura | | |
| 3 | Adicionar comentário em uma tarefa | Comentário salvo e visível | | |
| 4 | Dar like em um comentário | Like registrado | | |
| 5 | Tentar aprovar ou aceitar um ciclo | Ação **bloqueada** (sem permissão) | | |

---

## Resultado Final do Deploy

| Seção | Status | Responsável |
|-------|--------|-------------|
| 1. Configuração de Segurança | ⬜ Pendente | |
| 2. Banco de Dados | ⬜ Pendente | |
| 3. Frontend | ⬜ Pendente | |
| 4. E-mail / Notificações | ⬜ Pendente | |
| 5. Testes & Verificação | ⬜ Pendente | |
| 6. Smoke Tests Manuais | ⬜ Pendente | |

**Deploy autorizado por:** _________________________  
**Data/Hora de go-live:** _________________________  
**Observações gerais:**

> _Registre aqui qualquer desvio, item adiado com justificativa, ou incidente ocorrido durante o deploy._

---

*Checklist SHM 2.3 MVP Deploy — Revisão 2026-08-26*