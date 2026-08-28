# Roadmap: Assistente de Migração e Aproveitamento de Saldo de Contratos Vencidos

> Identificador: `002-migracao-saldo-contratos`
> Data: `2026-08-27`
> Requirements: `_reversa_forward/002-migracao-saldo-contratos/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

Implementação de um assistente especializado para migração e aproveitamento de saldo remanescente de contratos expirados/encerrados para contratos vigentes do mesmo cliente.
No backend Django, estendemos o `SaldoService` com o método transacional `migrar_saldo_contratos_vencidos()` e expomos duas actions no `SaldoViewSet`: `contratos_elegiveis` (GET) e `migrar` (POST), com garantia de integridade ACID e geração de logs em `ContratoAuditLog` e `HistoricoSaldo`.
No frontend React/Vite, criamos o componente interativo `MigracaoSaldoModal` integrado à visualização de contratos e saldo, permitindo ao gestor consultar contratos vencidos com saldo positivo e executar a transferência em lote ou sob demanda.

## 2. Princípios aplicados

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| I. Integridade ACID no Ledger de Saldo | Utiliza `select_for_update()` e transações atômicas no banco de dados. | respeita |
| II. Isolamento por Cliente | Validação estrita impedindo transferências entre clientes distintos. | respeita |
| III. Auditoria Dupla e Rastreabilidade | Cria registros no ledger (`HistoricoSaldo`) e auditoria contratual (`ContratoAuditLog`). | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Reutilizar a infraestrutura de `TransferenciaSaldo` e `HistoricoSaldo` | Mantém a consistência com o modelo imutável do sistema sem quebrar compatibilidade histórica. | Criar tabela separada de migração de contratos. | 🟢 |
| D-02 | Criar action REST dedicada `/api/saldo/contratos_elegiveis/` e `/api/saldo/migrar/` | Simplifica a consulta do frontend e encapsula a regra de filtro de elegibilidade no backend. | Fazer filtragem manual de todos os contratos no cliente frontend. | 🟢 |
| D-03 | Suportar migração com quantidade opcional (default total do saldo remanescente) | Atende o caso padrão de aproveitamento de 100% do saldo com um único clique do operador. | Exigir sempre digitação manual de quantidade decimal. | 🟢 |

## 4. Premissas

- Nenhuma premissa duvidosa adotada; todas as regras foram confirmadas no SDD e no código legado.

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|---|---|---|---|
| `SaldoService` | `backend/apps/saldo/services.py` | regra-alterada | Inclusão do método `migrar_saldo_contratos_vencidos()`. |
| `SaldoViewSet` | `backend/apps/saldo/views.py` | contrato-novo | Actions `contratos_elegiveis` e `migrar`. |
| Frontend Contratos/Saldo | `frontend/src/components/contratos/` & `frontend/src/pages/` | componente-novo | Modal assistente de migração de saldo de contratos. |

## 6. Delta no modelo de dados

- Resumo das mudanças: Não são necessárias novas migrações estruturais ou tabelas adicionais; a funcionalidade aproveita integralmente os modelos `Contrato`, `TransferenciaSaldo`, `HistoricoSaldo` e `ContratoAuditLog`.
- Detalhe completo em: `_reversa_forward/002-migracao-saldo-contratos/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|---|---|---|
| API Saldo Migração | HTTP REST (Django REST Framework) | `_reversa_forward/002-migracao-saldo-contratos/interfaces/saldo-migracao.md` |

## 8. Plano de migração

1. Implementar `SaldoService.migrar_saldo_contratos_vencidos()` com validações de cliente, status e saldo positivo.
2. Expor endpoints em `SaldoViewSet`.
3. Escrever suíte de testes unitários e de integração em `backend/tests/test_migracao_saldo.py`.
4. Criar e integrar o componente React `MigracaoSaldoModal`.
5. Validar cobertura e build do frontend.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Concorrência em migrações simultâneas de saldo | Alto | Baixa | Bloqueio pessimista via `select_for_update()` em transação atômica. |
| Transferência acidental entre clientes distintos | Crítico | Baixa | Validação estrita `c_origem.cliente_id == c_destino.cliente_id` com `ValidationError`. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] Testes automatizados cobrindo migração total, parcial e tentativas inválidas passando 100%
- [ ] Interface visual funcional com feedback em tempo real
- [ ] Adendo de convergência gerado em `_reversa_sdd/addenda/002-migracao-saldo-contratos.md`

## 11. Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-08-27 | Versão inicial gerada por `/reversa-plan` | reversa |
