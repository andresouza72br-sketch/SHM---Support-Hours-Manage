# 📋 Documento de Handoff — Higienização & Abertura Pública do Repositório SHM

> **Status da Sessão**: Etapas 1, 2, 3 e 4 concluídas e 100% validadas.  
> **Próxima Ação**: Executar Etapa 5 (Validação Final e Fechamento).  
> **Data**: 30/08/2026

---

## 1. Objetivo da Missão

Preparar o repositório do **Projeto SHM (Support Hours Manager)** para ser tornado **100% público no GitHub**, garantindo que qualquer exclusão ou alteração de arquivo seja previamente salva na pasta `backup-higienizacao/`.

---

## 2. Progresso Realizado

### ✅ Etapa 1: Dados Críticos, PII e Binários Duplicados (Concluída)
- Criada a pasta `backup-higienizacao/` e protegida no `.gitignore`.
- Arquivo `historico_manutencoes_iate_clube.csv` excluído do Git e preservado no backup.
- Eliminadas 3 cópias redundantes de PDFs (`README.pdf`, `docs/README.pdf`, `Manifesto/manifesto.pdf`), liberando ~6.86 MB.
- Preservados os 2 PDFs canônicos: `docs/SHM-Documentacao-Oficial.pdf` e `Manifesto/Manifesto-SHM-Engenharia-vs-Vibe-Coding.pdf`.
- `.gitignore` blindado contra planilhas (`*.csv`, `*.tsv`, `*.xlsx`, `*.xls`, `*.ods`), locks (`.~lock.*#`, `~$*`), temporários (`*.tmp`, `*.bak`) e `backup-higienizacao/`.

### ✅ Etapa 2: Sanitização de Hardcodes e Despersonalização (Concluída)
- Backups salvos em `backup-higienizacao/etapa-2/`.
- IP Tailscale (`100.126.72.23`) removido de `settings.py`, `dev.ps1` e `start-dev.ps1`, tornado dinâmico via `TAILSCALE_IP` no `.env`.
- `.env` e `backend/.env` configurados com `TAILSCALE_IP=100.126.72.23` e servidor SMTP local.
- `.env.example` e `backend/.env.example` limpos e padronizados.
- E-mails pessoais substituídos por e-mails modelo genéricos (`admin@shm.local`, `tecnico@shm.local`, `gerente@acme.com`, `analista@acme.com`, `suporte@shm.local`) em:
  - `seed_base_limpa.py`, `seed_demo_data.py`, `LoginPage.tsx`, `test_google_auth.py`, `reset_db.ps1`, `docs/API.md`, `testes/ROTEIRO_DE_TESTES.md`.

### ✅ Etapa 3: Segregação Modular na Pasta `tools/` (Concluída)
- Backups salvos em `backup-higienizacao/etapa-3/`.
- Estrutura `tools/` criada e populada:
  - `tools/mail-server/dev_mail_server.py`
  - `tools/database/` (`reset_db.ps1`, `seed_base_limpa.py`, `README.md`)
  - `tools/scripts/` (`generate_pdfs.py`, `git-hooks/`)
  - `tools/docs-testing/` (`ROTEIRO_DE_TESTES.md`)
- Ajustados imports e caminhos em `dev.ps1`, `run_mail_server.py`, `seed_base_limpa.py`, `reset_db.ps1`, `generate_pdfs.py` e `core.hooksPath`.
- Testado `dev.ps1 reset-db` com 100% de sucesso.
- Testes automatizados executados: **79/79 testes passaram** (`pytest backend` 100% verde).

### ✅ Etapa 4: Higienização de Rascunhos e Atualização do README.md (Concluída)
- Backups salvos em `backup-higienizacao/etapa-4/` (`brainstorm/`, `last-ssession.md`, `README.md`).
- Arquivos de rascunhos excluídos do Git: `brainstorm/` (`iteração-1..3-chatGPT.txt`) e `last-ssession.md`.
- `README.md` totalmente atualizado:
  - Badges e menções atualizados para **79 testes Pytest Passing**.
  - Tabela de credenciais sincronizada com e-mails corporativos modelo (`admin@shm.local`, `tecnico@shm.local`, `gerente@acme.com`, `analista@acme.com`) e usernames (`admin`, `tecnico`, `cligerente`, `clianalista`).
  - Árvore de diretórios atualizada com o novo módulo `tools/` (`mail-server/`, `database/`, `scripts/`, `docs-testing/`).
  - Adicionada documentação dos comandos do orquestrador CLI unificado `dev.ps1`.

---

## 3. Próximos Passos

### 🎯 Etapa 5: Validação Final e Fechamento
1. Executar `pytest backend` e `bun run build`.
2. Testar `dev.ps1 status` e `dev.ps1 start/stop`.
3. Revisar `git status` e preparar commit de fechamento da branch `feat-higienizacao-repo-publico`.

---

## 6. Prompt para Iniciar a Nova Sessão na Worktree

Copie e cole o prompt abaixo no chat da nova worktree para continuar imediatamente:

```markdown
Olá! Estou iniciando a sessão na nova worktree para executar a **Higienização e Abertura Pública do Repositório SHM**.

Já realizamos a auditoria completa na sessão anterior e o plano de ação detalhado está registrado no arquivo `_reversa_sdd/handoff_higienizacao_repo_publico.md`.

Nosso objetivo é:
1. Eliminar dados reais de clientes (CSV, PII, locks) e ajustar o `.gitignore`.
2. Remover IPs de rede privada/Tailscale e substituir e-mails pessoais em seeds, testes e telas de login por dados genéricos.
3. Preservar 100% das facilidades de dev/testes (Mail Server local, scripts de reset de banco, seeds determinísticos, gerador de PDFs), organizando-os na pasta dedicada `tools/`.
4. Trabalhar em etapas ordenadas, solicitando minha autorização para cada etapa.

Por favor, leia o arquivo `_reversa_sdd/handoff_higienizacao_repo_publico.md` e me apresente a proposta detalhada da **Etapa 1 (Higienização de Dados Críticos e Arquivos Residuais)** para que eu autorize a execução.
```
