# Requirements: Assistente de Migração e Aproveitamento de Saldo de Contratos Vencidos

> Identificador: `002-migracao-saldo-contratos`
> Data: `2026-08-27`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Esta feature implementa um Assistente (Wizard/Modal no Frontend e Endpoints no Backend) para identificar, calcular e transferir saldos positivos remanescentes de contratos expirados/encerrados para contratos vigentes do mesmo cliente. Isso potencializa a retenção e satisfação dos clientes, evitando perda manual de horas não utilizadas e garantindo auditoria completa no ledger imutável de saldo.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|---|---|---|
| `_reversa_sdd/domain.md#RN-03` | Vigência Contratual e Regra de Carência: contratos com data término expirada mantêm saldo remanescente em carência. | 🟢 |
| `_reversa_sdd/domain.md#RN-05` | Transferência de Saldo entre Contratos: permitida exclusivamente entre contratos do mesmo cliente com ledger duplo (`transferencia_envio` e `transferencia_recebimento`). | 🟢 |
| `_reversa_sdd/adrs/002-ledger-imutavel-historico-saldo.md` | O saldo do contrato nunca é alterado sem criar registros atômicos e imutáveis em `shm_historico_saldo`. | 🟢 |
| `_reversa_sdd/code-analysis.md#saldo` | `SaldoService.transferir()` e `SaldoViewSet.transferir()` executam transferência ACID com bloqueio pessimista (`select_for_update`). | 🟢 |
| `_reversa_sdd/contratos/` | Model `Contrato` possui `tipo=renovacao`, `contrato_referencia`, `status=expirado` e `data_fim_carencia`. | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---|---|---|
| Administrador / Gestor da Empresa | Aproveitar saldo remanescente de contrato vencido ao ativar renovação do cliente | Ao abrir o contrato novo/ativo do cliente, o assistente detecta contratos anteriores com saldo > 0 e permite migrar total ou parcialmente com 1 clique. |
| Cliente / Tomador | Visualizar a rastreabilidade das horas migradas do contrato anterior | No extrato de horas do contrato novo e no histórico do antigo, consulta o lançamento claro de migração/aproveitamento de saldo. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** Detecção Automática de Contratos Elegíveis para Migração 🟢
   - Contratos elegíveis na origem: mesmo cliente, status `expirado` ou `concluido`, com `saldo > 0`.
   - Contratos elegíveis no destino: mesmo cliente, status `ativo` ou `pendente_aceite`.
   - Origem no legado: `_reversa_sdd/domain.md#RN-03`, `_reversa_sdd/domain.md#RN-05`.
   - Tipo: nova.

2. **RN-02:** Migração Atômica com Auditoria e Vínculo Contratual 🟢
   - A migração deve registrar as transações no ledger (`HistoricoSaldo`) com justificativa clara ("Aproveitamento de saldo do contrato CT-XXXX para CT-YYYY").
   - Se o contrato destino foi cadastrado como `tipo="renovacao"` ou `tipo="aditivo"` com `contrato_referencia`, o assistente sugere automaticamente a migração total do saldo remanescente.
   - Registra evento de auditoria em `ContratoAuditLog` em ambos os contratos (origem e destino).
   - Tipo: nova.

3. **RN-03:** Encerramento/Zerar Saldo do Contrato Expirado 🟢
   - Se a migração transferir a totalidade do saldo remanescente (`quantidade == saldo`), o contrato de origem permanece `expirado`/`concluido` porém com `saldo = 0.00`.
   - Tipo: nova.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|---|---|---|---|---|
| RF-01 | Endpoint de Consulta de Elegibilidade (`/api/saldo/migracao-elegiveis/?cliente_id=X&destino_id=Y`) | Must | Retorna lista de contratos expirados/encerrados com saldo positivo para o cliente, indicando saldo disponível e data de expiração. | 🟢 |
| RF-02 | Execução em lote ou pontual de Migração de Saldo (`/api/saldo/migrar/`) | Must | Executa transferência de saldo via `SaldoService` com validações ACID (`select_for_update`), gravando `HistoricoSaldo` e `ContratoAuditLog`. | 🟢 |
| RF-03 | Assistente Visual no Frontend (Card / Modal no Detalhe do Contrato e Tela de Saldo) | Must | Componente React que exibe alerta quando há saldo aproveitável de contratos vencidos do mesmo cliente, com opção de simular e confirmar a migração. | 🟢 |
| RF-04 | Rastreabilidade no Histórico e Extrato de Horas | Should | Exibir badge indicativo de migração de saldo no extrato/timeline do contrato de origem e de destino. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|---|---|---|---|
| Desempenho | Execução da migração em < 500ms | Operação transacional curta com `select_for_update()` no PostgreSQL/SQLite. | 🟢 |
| Segurança | Restrito a administradores da empresa (`IsEmpresaAdmin`) | Proteção contra manipulação não autorizada de saldo de contratos. | 🟢 |
| Integridade / Concorrência | Isolamento ACID estrito | Evitar race condition de migração concorrente do mesmo contrato expirado. | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Migração com sucesso de saldo de contrato expirado para novo contrato
  Dado que o cliente "Empresa ABC" possui o contrato "CT-2025-001" (expirado com saldo de 15.00 horas)
  E possui o contrato novo "CT-2026-001" (ativo com saldo de 40.00 horas)
  Quando o administrador aciona o Assistente de Migração transferindo 15.00 horas de "CT-2025-001" para "CT-2026-001"
  Então o saldo de "CT-2025-001" passa a ser 0.00 horas
  E o saldo de "CT-2026-001" passa a ser 55.00 horas
  E são criados dois registros no HistoricoSaldo (débito na origem e crédito no destino)
  E são criados registros de auditoria em ContratoAuditLog

Cenário: Tentativa de migração entre contratos de clientes diferentes bloqueada
  Dado que o contrato origem pertence ao cliente A e o contrato destino ao cliente B
  Quando a requisição de migração for submetida
  Então a operação é rejeitada com ValidationError HTTP 400
  E nenhum saldo é modificado
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|---|---|---|
| RF-01 (Endpoint de Elegibilidade) | Must | Essencial para o assistente listar opções válidas |
| RF-02 (Endpoint e Serviço de Migração) | Must | Core da lógica de negócio e integridade do ledger |
| RF-03 (Assistente Modal/Card no Frontend) | Must | Interface de usuário necessária para a operação assistida |
| RF-04 (Badges no Extrato) | Should | Melhora a clareza para o gestor e o cliente |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda. Rode `/reversa-clarify` quando houver `[DÚVIDA]` pendente.

## 10. Lacunas

- Nenhuma dúvida em aberto identificada; os modelos e serviços legados de contratos e saldo cobrem integralmente o fluxo.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-08-27 | Versão inicial gerada por `/reversa-requirements` | reversa |
