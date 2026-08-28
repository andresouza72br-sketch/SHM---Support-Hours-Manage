# Matriz de Permissões e Perfis de Acesso (RBAC) — SHM 2.4

> Gerado pelo **Reversa Detective** em 2026-08-27

---

## Matriz de Controle de Acesso (RBAC)

| Funcionalidade / Endpoint | EMPRESA_ADMIN | EMPRESA_TECNICO | CLIENTE_GERENTE | CLIENTE_ANALISTA | Magic Link (Público) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Criar / Editar / Excluir Clientes** | ✅ Total | ❌ | ❌ | ❌ | ❌ |
| **Aprovar Cadastro de Cliente** | ✅ | ❌ | ✅ (Próprio) | ❌ | ✅ (Via Token) |
| **Criar / Editar Contratos & Saldo** | ✅ Total | ❌ | ❌ | ❌ | ❌ |
| **Visualizar Extrato de Saldo** | ✅ Todos | ✅ Todos | ✅ (Próprio) | ❌ | ❌ |
| **Upload / Exclusão de Documentos** | ✅ Total | ❌ | ❌ | ❌ | ❌ |
| **Download de Documentos / Relatório** | ✅ | ✅ | ✅ (Seu contrato) | ❌ | ❌ |
| **Abrir Pedido de Suporte** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Decompor Ciclos & Orçar Horas** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Aprovar / Rejeitar Orçamento** | ✅ | ❌ | ✅ | ❌ | ✅ (Via Token) |
| **Apontar Tarefas / Horas Reais** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Solicitar Aceite de Ciclo** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Conceder / Recusar Aceite Final** | ✅ | ❌ | ✅ | ❌ | ✅ (Via Token) |
| **Avaliar Satisfação do Ciclo (1-5★)** | ❌ | ❌ | ✅ | ✅ | ✅ (Via Token) |
| **Comentar em Ciclos & Reagir** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Converter Comentário em Tarefa** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Transferir Saldo entre Contratos** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Reabastecer Saldo de Contrato** | ✅ | ❌ | ❌ | ❌ | ❌ |