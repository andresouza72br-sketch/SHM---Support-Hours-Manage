# SHM — Support Hours Manager 2.0 ⏱️

Sistema integrado de governança, orçamento, execução e aceite de horas técnicas para contratos de suporte e serviços especializados de TI.

---

## 🎯 Arquitetura & Principais Regras de Negócio

1. **Hierarquia Estrutural**:
   - **Cliente** (`apps/clientes`): Cadastro PF/PJ com CPF/CNPJ validado.
   - **Contrato** (`apps/contratos`): Código `CT-YYYY-NNNN`, vigência, horas contratadas, carência de 30 dias após expiração para aproveitamento de saldo remanescente.
   - **Pedido de Suporte** (`apps/pedidos`): Protocolo `OSYYYYMMNNNN`, agrupador geral da demanda do cliente.
   - **Ciclos de Atendimento** (`apps/ciclos`): Decomposição da demanda em unidades atômicas (*Corretiva, Evolutiva, Preventiva, Análise, Consultoria, Treinamento*). Cada ciclo possui seu próprio ciclo de vida (*Orçado → Aguardando Aprovação → Aprovado → Em Execução → Aguardando Aceite → Aceito*).
   - **Tarefas** (`apps/tarefas`): Lançamento de apontamentos técnicos com horas estimadas e horas reais executadas.

2. **Regra de Ouro do Débito de Saldo**:
   - O saldo de horas do contrato **nunca** é debitado na aprovação do orçamento.
   - O débito é acionado **exclusivamente no Aceite Final do Ciclo** pelo cliente, debitando as **horas reais realizadas** (`horas_realizadas`).
   - Todo movimento de saldo é registrado de forma auditável e imutável em `apps/saldo/models.py` (`HistoricoSaldo`).

3. **Magic Links Públicos**:
   - Cada ciclo gera um token UUID único que permite ao tomador aprovar orçamentos e conceder aceites diretamente pelo navegador, sem atrito de login.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Python 3.11+
- Node.js 20+ ou Bun 1.2+

### 1. Inicializando o Backend (Django REST Framework)
```bash
# Ativar virtualenv e instalar dependências
uv pip install -r backend/requirements.txt --python .venv\Scripts\python.exe

# Executar migrações
.\.venv\Scripts\python.exe backend/manage.py migrate

# Popular banco de dados com massa de teste realista
.\.venv\Scripts\python.exe backend/manage.py seed_demo_data

# Iniciar servidor da API
.\.venv\Scripts\python.exe backend/manage.py runserver 8000
```

- **Swagger / Documentação OpenAPI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **Django Admin**: [http://localhost:8000/admin/](http://localhost:8000/admin/)

---

### 2. Inicializando o Frontend (React 19 + TypeScript + Vite + Tailwind CSS)
```bash
cd frontend
bun install
bun run dev
```

- **Aplicação Web**: [http://localhost:5173](http://localhost:5173)

---

## 🔑 Credenciais para Demonstração

| Perfil | Usuário | Senha | Descrição |
| :--- | :--- | :--- | :--- |
| **Cliente Gerente** | `gerente.acme` | `cliente123` | Tomador do contrato; aprova orçamentos e concede aceites |
| **Cliente Analista** | `analista.acme` | `cliente123` | Usuário solicitante da Acme Corp |
| **Empresa Admin** | `admin` | `admin123` | Administrador geral da empresa prestadora |
| **Empresa Técnico** | `tecnico` | `tecnico123` | Operador técnico; realiza apontamento de horas e tarefas |

---

## 🧪 Suíte de Testes Automatizados

Para executar os testes unitários e de integração de ponta a ponta:
```bash
.\.venv\Scripts\python.exe -m pytest backend/tests
```

Para validar a compilação e tipagem do frontend:
```bash
cd frontend && bun run build
```

---

## 📂 Dossiê do Legado
Todo o estudo aprofundado, auditoria forense do código legado, dicionário de dados e justificativas arquiteturais estão preservados na pasta [`relatorio-legado/`](file:///C:/Users/andre/mkt-dnb/dev/Antigravity/projeto-SHM/relatorio-legado/README.md).