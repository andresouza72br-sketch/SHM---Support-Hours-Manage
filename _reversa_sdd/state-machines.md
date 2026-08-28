# Máquinas de Estado do Sistema — SHM 2.4

> Gerado pelo **Reversa Detective** em 2026-08-27

---

## 1. Ciclo de Vida do Pedido (Protocolo OS)

```mermaid
stateDiagram-v2
    [*] --> Aberto: Cliente abre demanda
    Aberto --> Em_Orcamento: Técnico cria primeiro ciclo
    Em_Orcamento --> Aguardando_Aprovacao: Orçamento apresentado
    Aguardando_Aprovacao --> Em_Execucao: Cliente aprova orçamento
    Aguardando_Aprovacao --> Em_Orcamento: Cliente rejeita orçamento
    Em_Execucao --> Aguardando_Aceite: Técnico solicita aceite
    Aguardando_Aceite --> Em_Execucao: Cliente recusa aceite
    Aguardando_Aceite --> Concluido: Todos os ciclos aceitos
    Aberto --> Cancelado: Gestor cancela
    Em_Orcamento --> Cancelado: Gestor cancela
    Concluido --> [*]
    Cancelado --> [*]
```

---

## 2. Ciclo de Vida do Ciclo de Atendimento

```mermaid
stateDiagram-v2
    [*] --> Orcado: Criação pelo técnico
    Orcado --> Aguardando_Aprovacao: Apresenta orçamento + Magic Link
    Aguardando_Aprovacao --> Orcado: Cliente rejeita orçamento
    Aguardando_Aprovacao --> Aprovado: Cliente aprova (0h debitadas)
    Aprovado --> Em_Execucao: Técnico inicia execução
    Em_Execucao --> Aguardando_Aceite: Aponta tarefas e solicita aceite
    Aguardando_Aceite --> Em_Execucao: Cliente recusa aceite
    Aguardando_Aceite --> Aceito: Cliente concede aceite (💰 Débito real no Ledger)
    Orcado --> Cancelado: Cancelamento
    Aceito --> [*]
    Cancelado --> [*]
```

---

## 3. Ciclo de Vida do Contrato

```mermaid
stateDiagram-v2
    [*] --> Pendente_Aceite: Criação do contrato
    Pendente_Aceite --> Ativo: Aceite formalizado / Início de vigência
    Ativo --> Suspenso: Inadimplência ou bloqueio administrativo
    Suspenso --> Ativo: Regularização
    Ativo --> Expirado: Vencimento da vigência (data_termino)
    Expirado --> Ativo: Termo Aditivo / Renovação
    Ativo --> Concluido: Encerramento normal
    Ativo --> Cancelado: Distrato / Rescisão
    Expirado --> [*]
    Concluido --> [*]
    Cancelado --> [*]
```

---

## 4. Ciclo de Vida do Cliente

```mermaid
stateDiagram-v2
    [*] --> Pendente_Aprovacao: Cadastro criado
    Pendente_Aprovacao --> Ativo: Gestor aprova via Magic Link (7 dias)
    Ativo --> Suspenso: Bloqueio administrativo
    Suspenso --> Ativo: Reativação
    Ativo --> Inativo: Inativação / Arquivamento
    Inativo --> [*]
```