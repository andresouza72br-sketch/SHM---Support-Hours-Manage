# Máquinas de Estado do Sistema — SHM 2.5.0

> Gerado pelo **Reversa Detective** em 2026-09-05  
> Sistema: **SHM 2.5.0 (Support Hours Manager)**

---

## 1. Máquina de Estados: Ciclo Técnico (`shm_ciclo`)

```mermaid
stateDiagram-v2
    [*] --> orcado: Criação técnica
    orcado --> aguardando_aprovacao: Apresentar orçamento
    aguardando_aprovacao --> orcado: Orçamento rejeitado
    aguardando_aprovacao --> aprovado: Orçamento aprovado (Magic Link / App)
    aprovado --> em_execucao: Iniciar execução técnica
    em_execucao --> aguardando_aceite: Solicitar aceite (com validação de tolerância +30%)
    aguardando_aceite --> em_execucao: Aceite recusado pelo cliente
    aguardando_aceite --> aceito: Aceite formalizado (Debita saldo no ledger)
    orcado --> cancelado: Cancelamento
    aguardando_aprovacao --> cancelado: Cancelamento
    em_execucao --> cancelado: Cancelamento
    aceito --> [*]
    cancelado --> [*]
```

---

## 2. Máquina de Estados: Contrato (`shm_contrato`)

```mermaid
stateDiagram-v2
    [*] --> pendente_aceite: Cadastro inicial do contrato
    pendente_aceite --> ativo: Aceite formal / Ativação
    pendente_aceite --> cancelado: Cancelamento pré-ativação
    ativo --> suspenso: Suspensão administrativa
    suspenso --> ativo: Reativação
    ativo --> concluido: Encerramento com entrega completa
    ativo --> expirado: Data término atingida
    expirado --> ativo: Renovação / Aditivo
    ativo --> cancelado: Rescisão / Distrato
    concluido --> [*]
    expirado --> [*]
    cancelado --> [*]
```

---

## 3. Máquina de Estados: Pedido de Suporte (`shm_pedido`)

```mermaid
stateDiagram-v2
    [*] --> aberto: Abertura pelo cliente ou suporte
    aberto --> em_orcamento: Primeiro ciclo criado
    em_orcamento --> aguardando_aprovacao: Ciclos aguardando aprovação
    aguardando_aprovacao --> em_execucao: Ciclos aprovados e em trabalho
    em_execucao --> aguardando_aceite: Todos os ciclos submetidos a aceite
    aguardando_aceite --> concluido: Todos os ciclos aceitos
    aberto --> cancelado: Cancelamento
    concluido --> [*]
    cancelado --> [*]
```

---

## 4. Máquina de Estados: Convite de E-mail de Notificação (`shm_contrato_email_notificacao`)

```mermaid
stateDiagram-v2
    [*] --> pendente: Convite emitido com token de 7 dias
    pendente --> confirmado: Opt-in realizado na tela pública
    pendente --> recusado: Destinatário recusou recebimento
    pendente --> expirado: Prazo de 7 dias expirado sem ação
    confirmado --> [*]
    recusado --> [*]
    expirado --> [*]
```
