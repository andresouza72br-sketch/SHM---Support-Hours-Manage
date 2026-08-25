# 📜 Registro de Sessão — Implementação A2 e A3

## Resumo das Entregas Realizadas

### 1. A2: Aprovação de Orçamento de Ciclo (`Horas Estimadas ➔ Em Execução`)
- **Geração de Magic Link Criptográfico**:
  - Geração de token UUIDv4 único via modelo `CicloMagicLink` com expiração de **7 dias** (`expira_em = timezone.now() + timedelta(days=7)`).
- **Notificação e E-mail**:
  - Mensagem padronizada com link seguro para "Aprovar Orçamento" e aviso explícito de compliance:
    > *"Caso deseje Não Aprovar / Recusar este orçamento, a operação deve ser realizada exclusivamente via app/plataforma com a respectiva justificativa."*
- **Aprovação Pública via Magic Link**:
  - Validação de expiração (<= 7 dias) e idempotência/uso único (`usado == False`).
  - Atualização do status para `aprovado` e carimbo `aprovado_em`.
  - Captura forense de `aprovado_ip`, `aprovado_user_agent` e `aprovado_metodo = 'MAGIC_LINK'`.
- **Rejeição de Orçamento**:
  - Bloqueada no endpoint público (HTTP 403 Forbidden).
  - Permitida apenas para usuários autenticados com perfil `CLIENTE_GERENTE` via App com justificativa obrigatória.

---

### 2. A3: Aceite Final de Ciclo (`Horas Realizadas ➔ Débito no Ledger`)
- **Solicitação de Aceite**:
  - Gera token UUIDv4 exclusivo para Aceite Final com validade de **7 dias**.
  - Mensagem de notificação com CTA: *"Aceitar Entrega / De acordo em Debitar horas realizadas"*.
  - Aviso de governança: *"Caso deseje Recusar o aceite, o processo deve ser realizado exclusivamente via app/plataforma informando a justificativa técnica obrigatória."*
- **Aceite via Magic Link com Débito no Ledger**:
  - Validação de expiração e consumo único (`usado = True`, `usado_em = timezone.now()`).
  - Débito automático das `horas_realizadas` no contrato através de `SaldoService.consumir(...)`.
  - **Auditoria Forense (Compliance)**:
    - Gravação de `ip_origem`, `user_agent` e `metodo_aprovacao` no `HistoricoSaldo` (Ledger).
    - Gravação de `ip_origem` e `user_agent` no `TimelineEvent` (`apps/notificacoes/services.py:211-223`).
    - Gravação de `aceito_ip`, `aceito_user_agent` e `aceito_metodo` no `Ciclo`.
- **Recusa de Aceite**:
  - Bloqueada no endpoint público (HTTP 403).
  - Apenas realizável via App autenticado por `CLIENTE_GERENTE` com justificativa técnica obrigatória.

---

### 3. Modelos e Migrações Django
- **`CicloMagicLink`** (`shm_ciclo_magic_link`):
  - `ciclo` (FK), `tipo_acao` (`aprovacao_orcamento` / `aceite_ciclo`), `token` (UUIDv4), `expira_em`, `usado`, `usado_em`, `usado_ip`, `usado_user_agent`.
- **`Ciclo`**:
  - `aprovado_ip`, `aprovado_user_agent`, `aprovado_metodo`, `aceito_ip`, `aceito_user_agent`, `aceito_metodo`.
- **`HistoricoSaldo`**:
  - `ip_origem`, `user_agent`, `metodo_aprovacao`.
- **`TimelineEvent`**:
  - `ip_origem`, `user_agent`.

---

### 4. Interface Frontend (`MagicLinkPage.tsx`)
- Suporte a estados de link:
  - **Ativo**: Botão de ação direta (Aprovação ou Aceite) + card explicativo orientando o login no App para qualquer recusa/rejeição.
  - **Expirado**: Alerta visual informando a expiração do prazo de 7 dias com link de acesso ao portal.
  - **Consumido (Idempotência)**: Alerta de confirmação com carimbo de data e hora do uso anterior.

---

### 5. Regras de Governança & Notificações
- **Envio Exclusivo de Solicitações para o Gerente do Contrato**:
  - E-mails com Magic Link de **Aprovação de Orçamento (A2)** e **Aceite Final / Débito de Horas (A3)** são disparados **ESTRITAMENTE** para os usuários com perfil `CLIENTE_GERENTE` vinculados àquele cliente/contrato.
  - Usuários com perfil `CLIENTE_ANALISTA` e equipe da empresa não recebem os e-mails com links de aprovação/débito.
- **Avisos Imediatos para Gerente e Técnicos da Empresa**:
  - Assim que o cliente **aprova o orçamento**, são disparados notificações e e-mails para o **Gerente da Empresa (`EMPRESA_ADMIN`)** e **Técnicos da Empresa (`EMPRESA_TECNICO`)**, além do operador responsável, com CTA para iniciar a execução técnica no SHM.
  - Assim que o cliente **concede o aceite final (débito de horas)**, são disparados notificações e e-mails para o **Gerente da Empresa** e **Técnicos**, confirmando a conclusão do pedido e o débito no contrato.
- **Identificação Completa**:
  - Títulos e mensagens usam os termos de negócio (`Pedido OS...`, `Tipo de Atendimento`, `Contrato` e `Empresa`), sem expor chaves primárias internas (`Ciclo #...`).

---

### 6. Cobertura de Testes
- **Backend**: 23 testes automatizados (`pytest backend`), 100% aprovados.
- **Frontend**: Build TypeScript / Vite 100% aprovado.

