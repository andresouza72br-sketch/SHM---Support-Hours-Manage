# 07 - Critérios de Aceite (Acceptance Criteria)

Critérios formais de aceitação no padrão BDD (Gherkin) para os principais fluxos de negócio.

---

## 1. Dedução de Horas Realizadas no Aceite Final

```gherkin
Cenário: Aceite final de ciclo deduz horas realizadas do saldo do contrato
  Dado que o cliente "Empresa ABC" possui um contrato ativo com saldo de 50.0 horas
  E existe um ciclo "CIC-001" no estado "AGUARDANDO_ACEITE" com:
    | Tarefa | Horas Estimadas | Horas Realizadas | Concluída |
    | T-01   | 10.0            | 8.0              | Sim       |
    | T-02   | 5.0             | 6.0              | Sim       |
  Quando o usuário "gestor@empresaabc.com" com perfil "GESTOR_CLIENTE" confirma o aceite final do ciclo
  Então o ciclo transiciona para o estado "ACEITO"
  E o total de horas consumidas do contrato é incrementado em 14.0 horas (8.0 + 6.0)
  E o novo saldo do contrato passa a ser 36.0 horas (50.0 - 14.0)
  E uma entrada de timeline do tipo "ACEITE" é registrada com autor "gestor@empresaabc.com"
```

---

## 2. Aceite Final com Resultado de Saldo Negativo

```gherkin
Cenário: Ciclo aceito excede horas contratadas gerando saldo negativo
  Dado que o cliente "Empresa XYZ" possui um contrato ativo com saldo restante de 4.0 horas
  E existe um ciclo "CIC-002" no estado "AGUARDANDO_ACEITE" com 10.0 horas realizadas
  Quando o usuário com perfil "GESTOR_CLIENTE" confirma o aceite final
  Então o ciclo transiciona com sucesso para "ACEITO"
  E o saldo do contrato é recalculado para -6.0 horas
  E o sistema exibe alerta visual de saldo negativo no dashboard da Empresa e do Cliente
  E a operação NÃO é bloqueada
```

---

## 3. Transferência de Saldo (Rollover) entre Contratos

```gherkin
Cenário: Rollover de saldo positivo para novo contrato dentro de 30 dias
  Dado que o contrato "CTR-2025" do cliente "Empresa ABC" encerrou com saldo de 15.0 horas há 10 dias
  E o administrador cadastra um novo contrato "CTR-2026" com 100.0 horas contratadas
  Quando o administrador executa a transferência de saldo de "CTR-2025" para "CTR-2026" com motivo "Renovação Anual"
  Então um registro "SaldoTransferido" é criado com 15.0 horas
  E o contrato "CTR-2026" passa a ter "horas_herdadas" igual a 15.0
  E o saldo inicial disponível do contrato "CTR-2026" passa a ser 115.0 horas
```

---

## 4. Rollover de Saldo Negativo para Novo Contrato

```gherkin
Cenário: Compensação de saldo devedor em novo contrato
  Dado que o contrato "CTR-2025" encerrou com saldo de -8.0 horas
  E o administrador cria o contrato "CTR-2026" com 50.0 horas contratadas
  Quando o administrador transfere o saldo devedor para "CTR-2026"
  Então "CTR-2026" registra "horas_herdadas" igual a -8.0
  E o saldo inicial disponível de "CTR-2026" passa a ser 42.0 horas (50.0 - 8.0)
```

---

## 5. Bloqueio de Ações Não Autorizadas (RBAC)

```gherkin
Cenário: Técnico tenta aprovar orçamento ou dar aceite final
  Dado um usuário autenticado com perfil "TECNICO"
  Quando ele tenta submeter uma requisição de aprovação de orçamento ou de aceite final em um ciclo
  Então a requisição é rejeitada com código HTTP 403 Forbidden
  E o estado do ciclo permanece inalterado
```
