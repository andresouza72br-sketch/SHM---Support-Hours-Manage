# Business Rules Review — SHM 2.3 Pre-RC

> **Versão:** 2.3 Pre-RC  
> **Revisão:** 2026-08-26  
> **Escopo:** Revisão reversa das regras de negócio documentadas vs. implementação atual  
> **Apps:** `accounts`, `ciclos`, `clientes`, `comunicacao`, `contratos`, `core`, `notificacoes`, `pedidos`, `saldo`, `tarefas`

---

## Regras Validadas ✅

As seguintes regras de negócio estão confirmadas na implementação atual e cobertas pelos 37 testes de backend passando.

### 1. Controle de Acesso Baseado em Papel (RBAC)

| Papel | Escopo | Permissões-chave |
|-------|--------|-----------------|
| `EMPRESA_ADMIN` | Global | CRUD total: contratos, pedidos, ciclos, usuários, saldo |
| `EMPRESA_TECNICO` | Operacional | Leitura de contratos/pedidos; criar/executar ciclos; registrar tarefas |
| `CLIENTE_GERENTE` | Contrato específico | Aprovar/rejeitar ciclos; visualizar saldo; Magic Link |
| `CLIENTE_ANALISTA` | Contrato específico | Somente leitura; comentários; avaliar ciclos |

- **RN-001**: Usuários de empresa (`EMPRESA_*`) nunca acessam dados de outros clientes.
- **RN-002**: Usuários de cliente (`CLIENTE_*`) nunca acessam dados de outros contratos/clientes.
- **RN-003**: Apenas `EMPRESA_ADMIN` pode criar/editar contratos e definir limites de saldo.

### 2. Fluxo Principal (Core Flow)

```
Cliente → Contrato (CT-YYYY-NNNN) → Pedido (OSYYYYMMNNNN) → Ciclos → Tarefas
```

- **RN-010**: Todo pedido obrigatoriamente pertence a um contrato ativo.
- **RN-011**: O número do contrato segue o padrão `CT-YYYY-NNNN` (ano + sequencial de 4 dígitos).
- **RN-012**: O número do pedido (OS) segue o padrão `OSYYYYMMNNNN` (ano + mês + sequencial de 4 dígitos).
- **RN-013**: Ciclos são criados dentro de um pedido e possuem orçamento próprio em horas.
- **RN-014**: Tarefas são registradas dentro de ciclos, com horas lançadas por `EMPRESA_TECNICO`.

### 3. Máquina de Estados do Ciclo

```
orcado → aguardando_aprovacao → aprovado → em_execucao → aguardando_aceite → aceito
```

- **RN-020**: O ciclo inicia no estado `orcado` quando criado pelo técnico/admin.
- **RN-021**: A transição para `aguardando_aprovacao` é acionada explicitamente pelo técnico.
- **RN-022**: Apenas `CLIENTE_GERENTE` (ou `EMPRESA_ADMIN`) pode aprovar/rejeitar ciclos em `aguardando_aprovacao`.
- **RN-023**: A transição para `aprovado` libera o ciclo para execução; rejeição retorna para `orcado`.
- **RN-024**: `EMPRESA_TECNICO` inicia a execução, movendo o ciclo para `em_execucao`.
- **RN-025**: Ao concluir a execução, o técnico submete o ciclo para `aguardando_aceite`.
- **RN-026**: O cliente faz o **Aceite Formal**, movendo o ciclo para `aceito`.

### 4. Débito de Saldo — Regra Crítica

- **RN-030** ⚡ **CRÍTICO**: O débito no saldo ocorre **exclusivamente** no momento do **Aceite Formal** (`aceito`). **Nenhuma outra transição de estado debita saldo.**
- **RN-031**: O valor debitado é a soma das horas efetivamente lançadas nas tarefas do ciclo aceito.
- **RN-032**: O saldo nunca pode ficar negativo; a aprovação de um ciclo cujo valor excede o saldo disponível deve ser bloqueada.

### 5. Ledger Imutável — `HistoricoSaldo`

- **RN-040**: Cada débito gera um registro imutável em `HistoricoSaldo` com: `contrato`, `ciclo`, `valor`, `data`, `usuario_responsavel`.
- **RN-041**: Registros de `HistoricoSaldo` nunca são deletados ou editados após criação (append-only).
- **RN-042**: O saldo corrente de um contrato pode ser recalculado integralmente a partir do `HistoricoSaldo` (fonte de verdade).

### 6. Magic Links

- **RN-050**: Magic Links são gerados com token UUID v4, válidos por **7 dias**.
- **RN-051**: Magic Links são **de uso único** — invalidados imediatamente após o primeiro uso.
- **RN-052**: Magic Links permitem que `CLIENTE_GERENTE` aprove/rejeite ciclos sem estar autenticado na sessão web.
- **RN-053**: Cada Magic Link está vinculado a um ciclo específico e a um usuário específico.

### 7. Integridade de Documentos de Contrato

- **RN-060**: Documentos anexados a contratos têm seu hash **SHA-256** calculado e armazenado no momento do upload.
- **RN-061**: O hash permite verificação posterior de integridade do documento (detecção de adulteração).

### 8. Campos de Auditoria Forense

- **RN-070**: Eventos de aprovação registram obrigatoriamente: `ip_origem`, `user_agent`, `metodo_aprovacao`.
- **RN-071**: `metodo_aprovacao` diferencia aprovações via interface web autenticada vs. Magic Link.

---

## Regras com Gaps ⚠️

Regras que existem conceitualmente mas cuja implementação apresenta lacunas ou inconsistências identificadas.

### GAP-001: Validação de Saldo na Aprovação de Ciclo

- **Problema**: A regra RN-032 (bloquear aprovação se saldo insuficiente) pode não estar validada no momento da aprovação via Magic Link, apenas na interface autenticada.
- **Risco**: Um gerente pode aprovar um ciclo via Magic Link que excede o saldo disponível se a validação estiver apenas no serializer da API autenticada.
- **Recomendação**: Mover a validação de saldo para a camada de modelo/serviço, garantindo que seja executada independente do ponto de entrada.

### GAP-002: Rejeição de Ciclo — Estado de Retorno

- **Problema**: A especificação indica que a rejeição retorna ao estado `orcado`, mas não está claro se o histórico de rejeição é preservado ou se há um campo `motivo_rejeicao`.
- **Risco**: Perda de rastreabilidade em ciclos rejeitados e re-submetidos múltiplas vezes.
- **Recomendação**: Adicionar campo `motivo_rejeicao` (text nullable) e garantir que a transição de rejeição seja registrada no log de auditoria.

### GAP-003: Expiração e Invalidação de Magic Links

- **Problema**: A regra de 7 dias de validade está definida, mas não há clareza sobre o job/task que limpa tokens expirados do banco.
- **Risco**: Acúmulo de tokens expirados no banco de dados.
- **Recomendação**: Implementar management command Django (`cleanup_expired_magic_links`) ou filtrar por `created_at` em toda query de validação.

### GAP-004: Concorrência em Débito de Saldo

- **Problema**: Sem uso explícito de `select_for_update()` na leitura do saldo antes do débito, há risco de race condition em cenários de alta concorrência.
- **Risco**: Dois aceites simultâneos podem ambos ler o mesmo saldo disponível e ambos debitar, resultando em saldo negativo.
- **Recomendação**: Envolver a operação de débito em `transaction.atomic()` com `select_for_update()` no registro de saldo.

### GAP-005: Notificações em Falha de E-mail

- **Problema**: O app `notificacoes` dispara e-mails, mas não há evidência de mecanismo de retry ou fila para falhas de SMTP.
- **Risco**: Notificações silenciosamente perdidas em falhas temporárias de SMTP.
- **Recomendação**: Para MVP, usar `EMAIL_BACKEND = console` e documentar. Para produção, integrar Celery + Redis ou similar.

---

## Regras Ausentes / A Implementar 🔴

Funcionalidades e regras de negócio identificadas como necessárias mas ainda não implementadas.

### MISSING-001: Cancelamento de Ciclo

- **Descrição**: Não há estado `cancelado` na máquina de estados do ciclo.
- **Impacto**: Um ciclo que não será executado fica preso em estado intermediário sem resolução formal.
- **Proposta**: Adicionar estado `cancelado` acessível a partir de `orcado`, `aguardando_aprovacao` e `aprovado` (não após `em_execucao`). Cancelamento por `EMPRESA_ADMIN` apenas.

### MISSING-002: Controle de Validade do Contrato

- **Descrição**: Contratos possuem datas de vigência mas não há regra que bloqueie criação de pedidos em contratos vencidos.
- **Impacto**: Pedidos podem ser criados em contratos expirados, gerando inconsistência contábil.
- **Proposta**: Validar `contrato.data_fim >= today()` ao criar pedidos. Adicionar status `expirado` ao contrato.

### MISSING-003: Limite de Ciclos por Pedido

- **Descrição**: Não há limite documentado ou validado para o número de ciclos que um pedido pode ter.
- **Impacto**: Pedidos podem crescer indefinidamente sem controle gerencial.
- **Proposta**: Campo opcional `max_ciclos` no Pedido, com validação no endpoint de criação de ciclo.

### MISSING-004: Política de Retenção de Dados (LGPD)

- **Descrição**: Não há política definida para anonimização ou remoção de dados de clientes inativos.
- **Impacto**: Risco de não-conformidade com LGPD após encerramento de contratos.
- **Proposta**: Documentar e implementar management command de anonimização, acionável manualmente por `EMPRESA_ADMIN`.

### MISSING-005: Rate Limiting em Magic Links

- **Descrição**: Não há proteção contra brute-force ou enumeração de tokens de Magic Link.
- **Impacto**: Tokens UUID v4 são seguros contra brute-force, mas enumeração de endpoints pode expor informações.
- **Proposta**: Aplicar throttling DRF no endpoint de validação de Magic Link (ex: 10 req/min por IP).

### MISSING-006: Relatório de Consumo de Horas

- **Descrição**: Não há endpoint que produza relatório consolidado de horas consumidas por contrato/período.
- **Impacto**: Clientes e admin precisam calcular manualmente a partir do `HistoricoSaldo`.
- **Proposta**: Endpoint `GET /api/contratos/{id}/relatorio/?periodo=YYYY-MM` retornando JSON com horas orçadas vs. consumidas.

---

## Histórias de Usuário por Perfil

### EMPRESA_ADMIN

> Papel com visibilidade e controle total sobre o sistema.

| ID | Como... | Quero... | Para... |
|----|---------|----------|---------|
| US-EA-01 | EMPRESA_ADMIN | Criar e configurar contratos com clientes | Formalizar o acordo de prestação de serviços |
| US-EA-02 | EMPRESA_ADMIN | Definir o saldo inicial de horas de um contrato | Controlar o orçamento disponível para o cliente |
| US-EA-03 | EMPRESA_ADMIN | Visualizar o `HistoricoSaldo` de qualquer contrato | Auditar todos os débitos e garantir integridade financeira |
| US-EA-04 | EMPRESA_ADMIN | Gerenciar usuários (criar, editar, inativar) de empresa e cliente | Controlar o acesso ao sistema |
| US-EA-05 | EMPRESA_ADMIN | Cancelar qualquer ciclo em estados não-finais | Corrigir pedidos criados incorretamente |
| US-EA-06 | EMPRESA_ADMIN | Visualizar dashboard consolidado de todos os contratos | Ter visão executiva do status operacional |
| US-EA-07 | EMPRESA_ADMIN | Adicionar crédito ao saldo de um contrato | Refletir recargas ou ajustes contratuais |

### EMPRESA_TECNICO

> Papel operacional responsável pela entrega dos serviços.

| ID | Como... | Quero... | Para... |
|----|---------|----------|---------|
| US-ET-01 | EMPRESA_TECNICO | Criar ciclos dentro de pedidos ativos | Organizar o trabalho em blocos aprovados |
| US-ET-02 | EMPRESA_TECNICO | Submeter um ciclo para aprovação do cliente | Obter autorização antes de iniciar execução |
| US-ET-03 | EMPRESA_TECNICO | Registrar tarefas com horas lançadas em ciclos em execução | Documentar o trabalho realizado com granularidade |
| US-ET-04 | EMPRESA_TECNICO | Submeter um ciclo para aceite formal do cliente | Formalizar a conclusão e acionar o débito de saldo |
| US-ET-05 | EMPRESA_TECNICO | Comentar em ciclos e tarefas | Comunicar-me com o cliente sem sair da plataforma |
| US-ET-06 | EMPRESA_TECNICO | Visualizar o saldo disponível do contrato (leitura) | Saber se há orçamento antes de criar novos ciclos |

### CLIENTE_GERENTE

> Papel de aprovação e supervisão no lado do cliente.

| ID | Como... | Quero... | Para... |
|----|---------|----------|---------|
| US-CG-01 | CLIENTE_GERENTE | Receber notificação por e-mail quando um ciclo aguarda aprovação | Não perder solicitações pendentes |
| US-CG-02 | CLIENTE_GERENTE | Aprovar ou rejeitar ciclos via Magic Link (sem login) | Agilizar aprovações mesmo sem acesso à plataforma |
| US-CG-03 | CLIENTE_GERENTE | Aprovar ciclos pela interface web autenticada | Ter controle formal com registro de sessão |
| US-CG-04 | CLIENTE_GERENTE | Realizar o Aceite Formal de ciclos concluídos | Confirmar recebimento do serviço e autorizar débito |
| US-CG-05 | CLIENTE_GERENTE | Visualizar saldo atual e histórico de débitos do meu contrato | Controlar o consumo de horas contratadas |
| US-CG-06 | CLIENTE_GERENTE | Adicionar comentários e avaliações (1-5 estrelas) nos ciclos | Dar feedback formal sobre os serviços entregues |
| US-CG-07 | CLIENTE_GERENTE | Rejeitar um ciclo com motivo | Solicitar revisão antes de aprovar execução |

### CLIENTE_ANALISTA

> Papel de acompanhamento operacional no lado do cliente.

| ID | Como... | Quero... | Para... |
|----|---------|----------|---------|
| US-CA-01 | CLIENTE_ANALISTA | Visualizar todos os ciclos e tarefas do meu contrato | Acompanhar o progresso dos serviços |
| US-CA-02 | CLIENTE_ANALISTA | Comentar em ciclos e tarefas | Comunicar dúvidas e feedbacks operacionais |
| US-CA-03 | CLIENTE_ANALISTA | Dar like e responder comentários | Interagir com a equipe de forma assíncrona |
| US-CA-04 | CLIENTE_ANALISTA | Avaliar ciclos concluídos (1-5 estrelas) | Registrar satisfação com a entrega |
| US-CA-05 | CLIENTE_ANALISTA | Visualizar o histórico de horas consumidas | Entender o ritmo de consumo do saldo |

---

## Cobertura de Testes vs Regras de Negócio

> **Status atual:** 37 testes de backend passando (pytest).

| Área | Regras Cobertas | Status | Observações |
|------|----------------|--------|-------------|
| RBAC / Permissões | RN-001, RN-002, RN-003 | ✅ Coberto | Testes de permissão por papel |
| Máquina de estados — transições válidas | RN-020 a RN-026 | ✅ Coberto | Happy path das transições |
| Máquina de estados — transições inválidas | RN-020 a RN-026 | ⚠️ Parcial | Faltam testes de transições ilegais (ex: `aceito → em_execucao`) |
| Débito no Aceite Formal | RN-030, RN-031 | ✅ Coberto | Regra crítica testada |
| Bloqueio de saldo negativo | RN-032 | ⚠️ Parcial | Coberto na API; não testado via Magic Link |
| HistoricoSaldo imutável | RN-040, RN-041, RN-042 | ✅ Coberto | Append-only verificado |
| Magic Links — uso único | RN-050, RN-051 | ✅ Coberto | Token invalidado após uso |
| Magic Links — expiração 7 dias | RN-052, RN-053 | ⚠️ Parcial | Validação de expiração não testada com mock de tempo |
| Hash SHA-256 de documentos | RN-060, RN-061 | ⚠️ Parcial | Hash gerado; verificação posterior não testada |
| Campos de auditoria forense | RN-070, RN-071 | ⚠️ Parcial | Campos presentes; completude não validada em testes |
| Like+Reply em comentários | Pre-RC | 🔴 Ausente | Feature nova, sem cobertura ainda |
| AvaliacaoCiclo (estrelas) | Pre-RC | 🔴 Ausente | Feature nova, sem cobertura ainda |

**Meta recomendada para RC:** ≥ 60 testes, cobrindo todas as transições inválidas de estado e os dois fluxos de aprovação (autenticado + Magic Link).

---

## Oportunidades de Melhoria Identificadas

### 🔧 Arquitetura e Código

1. **Service Layer**: Extrair lógica de negócio complexa (débito de saldo, transições de ciclo) dos serializers/views para uma camada de serviços (`services.py` por app), facilitando testes unitários isolados.

2. **Signals vs. Service calls**: Avaliar uso de Django Signals para efeitos colaterais (ex: envio de notificação após transição de estado) para desacoplar apps. Documentar a escolha arquitetural.

3. **Tipagem nos serializers DRF**: Adicionar type hints e docstrings nos serializers mais complexos (`ciclos`, `saldo`) para facilitar manutenção.

### 🔐 Segurança

4. **Rate limiting global**: Aplicar `DEFAULT_THROTTLE_RATES` no DRF para todos os endpoints não autenticados, especialmente Magic Links e login.

5. **CORS configurado por ambiente**: Garantir que `CORS_ALLOWED_ORIGINS` nunca use wildcard `*` em produção; configurar via variável de ambiente.

6. **Rotação de SECRET_KEY**: Documentar procedimento de rotação de `SECRET_KEY` e impacto em sessões ativas e tokens existentes.

### 📊 Observabilidade

7. **Structured Logging**: Implementar logging estruturado (JSON) para eventos críticos (aprovação, débito, Magic Link usado) para facilitar auditoria em produção.

8. **Health Check endpoint**: Adicionar `GET /api/health/` retornando status do banco e versão da aplicação, útil para monitoramento.

### 🧪 Qualidade

9. **Factory Boy + Faker**: Adotar `factory_boy` para geração de fixtures de teste, reduzindo código repetitivo e facilitando criação de cenários complexos.

10. **Testes de integração E2E**: Para o Pre-RC, considerar ao menos 2-3 testes Playwright cobrindo os fluxos críticos: aprovação via Magic Link e Aceite Formal com débito de saldo.

---

*Documento gerado em revisão reversa da implementação SHM 2.3 Pre-RC — 2026-08-26*