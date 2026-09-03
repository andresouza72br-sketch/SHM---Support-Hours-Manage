# Matriz de Permissões e Controle de Acesso (RBAC) — SHM 2.5.0

> Gerado pelo **Reversa Detective** em 2026-09-03  
> Sistema: **SHM 2.5.0 (Support Hours Manager)**

---

| Módulo / Recurso | Ação / Endpoint | EMPRESA_ADMIN | EMPRESA_TECNICO | CLIENTE_GERENTE | CLIENTE_ANALISTA |
|---|---|:---:|:---:|:---:|:---:|
| **Accounts** | Gerenciar usuários e papéis | ✅ Total | ❌ Negado | ❌ Negado | ❌ Negado |
| **Accounts** | Login tradicional, Magic Link e OAuth | ✅ Permitido | ✅ Permitido | ✅ Permitido | ✅ Permitido |
| **Clientes** | Criar, editar e excluir clientes | ✅ Total | 👁️ Visualizar | ❌ Negado | ❌ Negado |
| **Clientes** | Aprovar cadastro via Magic Link | ❌ (N/A) | ❌ (N/A) | ✅ Tomador | ❌ Negado |
| **Contratos** | Criar contrato e aditivos | ✅ Total | 👁️ Visualizar | ❌ Negado | ❌ Negado |
| **Contratos** | Aceitar contrato formalmente | ❌ (N/A) | ❌ (N/A) | ✅ Tomador | ❌ Negado |
| **Contratos** | Upload e exclusão de documentos | ✅ Total | 👁️ Download | 👁️ Download | ❌ Negado |
| **Contratos** | Gestão de e-mails de notificação | ✅ Total | ❌ Negado | 👁️ Visualizar | ❌ Negado |
| **Pedidos** | Abrir chamado de suporte | ✅ Permitido | ✅ Permitido | ✅ Próprios | ✅ Próprios |
| **Pedidos** | Visualizar chamados | ✅ Todos | ✅ Todos | ✅ Próprios | ✅ Próprios |
| **Ciclos** | Criar ciclo e decompor pedido | ✅ Permitido | ✅ Permitido | ❌ Negado | ❌ Negado |
| **Ciclos** | Apresentar orçamento técnico | ✅ Permitido | ✅ Permitido | ❌ Negado | ❌ Negado |
| **Ciclos** | Aprovar ou rejeitar orçamento | ❌ Negado | ❌ Negado | ✅ Próprios | ❌ Negado |
| **Ciclos** | Iniciar execução e apontar horas | ✅ Permitido | ✅ Permitido | ❌ Negado | ❌ Negado |
| **Ciclos** | Solicitar aceite (com justificativa se > 30%) | ✅ Permitido | ✅ Permitido | ❌ Negado | ❌ Negado |
| **Ciclos** | Conceder ou recusar aceite formal | ❌ Negado | ❌ Negado | ✅ Próprios | ❌ Negado |
| **Ciclos** | Avaliar ciclo com nota 1-5 estrelas | ❌ Negado | ❌ Negado | ✅ Próprios | ❌ Negado |
| **Saldo** | Consultar extrato e histórico de saldo | ✅ Todos | ✅ Todos | ✅ Próprios | ❌ Negado |
| **Saldo** | Reabastecer saldo de horas | ✅ Permitido | ❌ Negado | ❌ Negado | ❌ Negado |
| **Saldo** | Transferir saldo entre contratos ativos | ✅ Permitido | ❌ Negado | ❌ Negado | ❌ Negado |
| **Saldo** | Migrar saldo remanescente de vencidos | ✅ Permitido | ❌ Negado | ❌ Negado | ❌ Negado |
| **Saldo** | Compensar saldo devedor anterior | ✅ Permitido | ❌ Negado | ❌ Negado | ❌ Negado |
| **Notificações** | Configurar regras e categorias | ✅ Total | ❌ Negado | ❌ Negado | ❌ Negado |
| **Notificações** | Receber alertas in-app e e-mail | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | 🟡 Condicional |
