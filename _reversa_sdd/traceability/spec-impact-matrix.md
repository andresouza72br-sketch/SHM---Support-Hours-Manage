# Matriz de Impacto entre Componentes (Spec Impact Matrix)

> Gerado pelo **Reversa Architect** em 2026-08-27

---

| Componente Modificado | Componentes Impactados | Risco | Mitigação |
|---|---|---|---|
| `accounts` (RBAC) | Todos os módulos | Crítico | Testes de permissão unitários em cada endpoint |
| `clientes` (Validação / Status) | `contratos`, `pedidos` | Alto | Validação no serializador e bloqueio de criação em cliente inativo |
| `contratos` (Vigência / Carência) | `pedidos`, `saldo` | Crítico | Validação de `em_carencia` no vínculo de pedidos |
| `ciclos` (Workflow / Aceite) | `saldo`, `pedidos`, `notificacoes` | Crítico | Transação atômica em `CicloService.aceitar_ciclo` |
| `tarefas` (Apontamento) | `ciclos`, `saldo` | Alto | Recálculo atômico no `save()` de `Tarefa` |
| `saldo` (Ledger) | `contratos`, `ciclos` | Crítico | `select_for_update()` obrigatório em todas as transações |