# 📘 Manual de Governança, Higienização e Fluxo de Worktrees (SHM 2.3)

> **Objetivo:** Garantir que o repositório público no GitHub permaneça 100% higienizado (sem vazamento de ferramentas de IA, prompts ou planos temporários), enquanto você mantém histórico, diffs visuais e sincronização perfeita entre Worktrees e a Main no seu computador.

---

## 🏛️ 1. Arquitetura em Duas Camadas

`mermaid
flowchart TD
    subgraph PublicRemote ["Camada Pública (GitHub)"]
        direction TB
        Code["Código-Fonte (Backend + Frontend)"]
        SDD["_reversa_sdd/ (Especificações SDD e Arquitetura)"]
        GitIgnore[".gitignore (Regras Oficiais de Bloqueio)"]
    end

    subgraph LocalWorkspace ["Camada Local (Seu Computador)"]
        direction TB
        MainRepo["Main Base: C:/Users/andre/mkt-dnb/dev/Antigravity/projeto-SHM/"]
        Worktrees["Worktrees: C:/Users/andre/orca/workspaces/projeto-SHM/..."]
        PrivateItems[".reversa | _reversa_forward | _reversa_refactor | Skills"]
    end

    subgraph ExternalVault ["Vault de Segurança (Fora do Git - Risco Zero)"]
        VaultDir["C:/Users/andre/orca/backups-locais/projeto-SHM/"]
        Snapshots["Snapshots com Data/Hora e Branch"]
    end

    LocalWorkspace -- "git push origin" --> PublicRemote
    Worktrees -- ".\dev.ps1 sync" --> MainRepo
    Worktrees -- ".\dev.ps1 sync" --> ExternalVault
    VaultDir -- ".\dev.ps1 diff" --> Worktrees
`

### 📋 Matriz de Visibilidade dos Arquivos

| Pasta / Arquivo | Destino | Motivo |
| :--- | :---: | :--- |
| **ackend/ e rontend/** | 🌐 **GitHub Remoto** | Código da aplicação (Django REST, React/Vite, Tailwind). |
| **_reversa_sdd/** | 🌐 **GitHub Remoto** | Documentação pública e viva (SDD, User Stories, Diagramas). |
| **.gitignore** | 🌐 **GitHub Remoto** | Garante que novos clones respeitem as regras de proteção. |
| **_reversa_forward/** | 💻 **Apenas Local** | Rascunhos de evolução de features em andamento. |
| **_reversa_refactor/** | 💻 **Apenas Local** | Oportunidades de refatoração levantadas por agentes de IA. |
| **.agents/skills/ & .claude/skills/** | 💻 **Apenas Local** | Suas personas, ferramentas e inteligências proprietárias. |
| **.reversa/** | 💻 **Apenas Local** | Configurações internas do framework Reversa. |
| **.worktree-copy** | 💻 **Apenas Local** | Lista de arquivos/pastas locais clonados em novas worktrees. |
| **C:\Users\andre\orca\backups-locais\** | 🛡️ **Vault Externo** | Backups incrementais salvos fisicamente fora do Git. |

---

## 🚀 2. O que fazer agora (Finalizando a Branch de Higienização)

Como já implementamos e testamos tudo na branch eat-higienizacao-repo-publico, siga estes 3 passos:

### Passo 1: Enviar a Branch Higienizada para o GitHub
No terminal da sua worktree atual:
`powershell
git push origin andresouza72br-sketch/feat-higienizacao-repo-publico
`

### Passo 2: Fazer o Merge na Main no GitHub
1. Abra o GitHub e crie o Pull Request da branch eat-higienizacao-repo-publico para a main.
2. Conclua o Merge (Merge Pull Request).
*(A partir deste momento, o repositório público no GitHub estará 100% limpo, contendo apenas o código e o _reversa_sdd).*

### Passo 3: Atualizar a sua Main Local
No terminal da pasta principal (C:\Users\andre\mkt-dnb\dev\Antigravity\projeto-SHM):
`powershell
git pull origin main
`

---

## 🔄 3. Guia Operacional do Dia a Dia (Novas Worktrees)

Quando você for criar novas features ou refatorações:

### 1️⃣ Ao Criar uma Nova Worktree (no Orca ou via CLI)
- O hook post-checkout roda automaticamente.
- Ele lê o .worktree-copy da main e injeta automaticamente suas skills, rascunhos e configs (.env, sqlite) na nova pasta.
- **Resultado:** A nova worktree nasce 100% pronta para trabalhar com os agentes de IA.

### 2️⃣ Durante o Desenvolvimento
- Você programa normalmente.
- Pode usar git add . e git commit à vontade: o .gitignore impede que qualquer ferramenta de IA ou arquivo temporário seja rastreado por engano.
- Seus commits conterão apenas código e documentação pública _reversa_sdd.

### 3️⃣ Antes de Finalizar/Deletar a Worktree
Sempre execute o comando de sincronização:
`powershell
.\dev.ps1 sync
`
* O que ele faz:
  1. Cria um snapshot seguro no Vault externo (C:\Users\andre\orca\backups-locais\projeto-SHM\YYYYMMDD_HHMMSS__sua-branch).
  2. Copia os planos (_reversa_forward), refatorações e skills aprimoradas da worktree para a sua base principal local (main).
* Depois de rodar o sync, você pode fazer o merge no GitHub e descartar a worktree com total tranquilidade.

---

## 🔍 4. Como Comparar Versões e Fazer Diffs

Se você quiser comparar o que foi alterado na sua worktree em relação ao último backup ou à base principal:

### Ver resumo no terminal:
`powershell
.\dev.ps1 diff
`

### Abrir comparação visual lado a lado no VS Code:
`powershell
.\dev.ps1 diff -VsCode
`

### Ver lista de todos os backups históricos disponíveis:
`powershell
.\dev.ps1 backups
`

---

## ❓ 5. Perguntas Frequentes (FAQ)

### P: Se eu criar uma skill nova em uma worktree, ela vai para a main?
**R:** Sim! Quando você rodar .\dev.ps1 sync, a nova skill será copiada para a pasta da main local e ficará disponível automaticamente para todas as próximas worktrees que você abrir.

### P: O que acontece se uma IA sobrescrever algo errado num plano de feature?
**R:** Basta rodar .\dev.ps1 backups para ver a lista de snapshots anteriores, ou usar .\dev.ps1 diff para comparar o arquivo atual com a versão salva no Vault. O Vault externo preserva cada versão com data e hora.

### P: Existe risco de eu rodar git push e subir minhas skills sem querer?
**R:** **Zero risco.** As pastas privadas estão declaradas no .gitignore oficial (já commitado no repositório) e o Vault de backups está localizado fora do diretório do Git.
