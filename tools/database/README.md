# 🗄️ Base de Dados de Testes Determinística — SHM 2.4

> Pasta dedicada à gestão, reset e semeadura da base de dados limpa e sem resíduos ("sem lixos") para baterias de testes manuais, homologação de fluxos e validação de regras de negócio.

---

## 🚀 Como Resetar e Recriar a Base Limpa

Basta executar o script PowerShell em qualquer terminal:

```powershell
.\tools\database\reset_db.ps1
```

Ou através do comando principal do projeto:

```powershell
.\dev.ps1 reset-db
```

### O que o script faz automaticamente:
1. Encerra com segurança processos que possam estar travando o SQLite (`db.sqlite3`).
2. Remove o banco físico antigo e limpa mídias/anexos residuais de testes passados.
3. Aplica todas as migrações Django (`migrate`) atualizadas do zero.
4. Executa a semeadura determinística via `seed_base_limpa.py`.
5. Garante IDs previsíveis (iniciando em 1), chaves estrangeiras íntegras e Ledger contábil perfeitamente equilibrado.

---

## 🔑 Usuários e Credenciais Oficiais

A base contém estritamente os **4 usuários oficiais**, integrados aos botões de **Acesso Rápido (1-Clique)** e à **Simulação de Google OAuth2**:

| Papel | Usuário | Senha | E-mail Oficial | Perfil & Responsabilidade |
|---|---|---|---|---|
| 🏢 **Empresa Admin** | `admin` | `admin123` | `admin@shm.local` | Gestão de contratos, orçamentação e visualização global de clientes. |
| 🛠️ **Empresa Técnico** | `tecnico` | `tecnico123` | `tecnico@shm.local` | Execução técnica, lançamento de tarefas e solicitação de aceite. |
| 👔 **Cliente Gerente** | `cligerente` | `cliente123` | `gerente@acme.com` | Gestor do contrato Acme Corp: **aprova orçamentos (A2)** e **concede aceite final com débito de horas (A3)**. |
| 🧑‍💻 **Cliente Analista** | `clianalista` | `cliente123` | `analista@acme.com` | Operacional da Acme Corp: abre solicitações e acompanha Kanban. |

---

## 📋 Entidades Criadas na Base Limpa

### 1. Cliente B2B
- **Razão Social:** `Acme Indústria e Comércio S/A` (`Acme Corp`)
- **CNPJ:** `12345678000195` (Ativo)

### 2. Contrato de Suporte Oficial
- **Número:** `CT-2026-0001`
- **Franquia:** `100.00h`
- **Saldo Inicial:** `100.00h`
- **Integridade Criptográfica:** Documento assinado `Contrato_Prestacao_Servicos_Acme_2026.pdf` com hash SHA-256 autêntico e carimbo de auditoria em `ContratoAuditLog`.
- **Ledger Contábil (`HistoricoSaldo`):** Registro de carga inicial de 100.00h com método `SISTEMA`, garantindo conciliação matemática no Extrato do Contrato.

### 3. Cenários de Teste Estruturados

| Protocolo | Status | Ciclo / Horas | Objetivo do Teste |
|---|---|---|---|
| **OS2026080001** | `AGUARDANDO_ACEITE` | Corretiva (8h estimadas / 6h realizadas) | **Fluxo A3:** Entrar como `gerente@acme.com` e testar o **Aceite Final** (via App ou Magic Link), confirmando o débito de 6h no saldo do contrato (`100h -> 94h`). |
| **OS2026080002** | `AGUARDANDO_APROVACAO` | Evolutiva (8h estimadas / 0h realizadas) | **Fluxo A2:** Entrar como `gerente@acme.com` e testar a **Aprovação de Orçamento** (via App ou Magic Link), liberando o chamado para `EM_EXECUCAO`. |
| **OS2026080003** | `ABERTO` | Sem ciclo ainda | **Fluxo Inicial:** Chamado novo recém-aberto pela analista, pronto para triagem e orçamentação pela equipe da empresa. |
