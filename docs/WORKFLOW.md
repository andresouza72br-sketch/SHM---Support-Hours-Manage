# 🔄 Guia de Workflow & Ciclos de Atendimento

## 1. O Que É a Decomposição em Ciclos?

Em projetos de suporte, uma solicitação do cliente raramente é homogênea. Uma demanda como *"Sistema lento e precisamos de treinamento"* contém duas naturezas distintas:
1. **Ciclo 1: Corretiva / Tuning** (Gargalo de infraestrutura/queries).
2. **Ciclo 2: Treinamento** (Capacitação funcional de usuários).

No SHM 2.0, o **Pedido de Suporte** atua como agrupador macro, enquanto a equipe técnica decompõe o escopo em **Ciclos Atômicos**.

---

## 2. As 6 Fases do Ciclo de Vida

```
[1. Orçado]
    │
    ▼ (Apresentar Orçamento)
[2. Aguardando Aprovação] ──(Rejeitar)──► [1. Orçado]
    │
    ▼ (Aprovar)
[3. Aprovado]
    │
    ▼ (Iniciar Execução)
[4. Em Execução] ◄──(Recusar Aceite)──┐
    │                                  │
    ▼ (Solicitar Aceite)               │
[5. Aguardando Aceite] ────────────────┘
    │
    ▼ (Conceder Aceite Final)
[6. Aceito & Debitado]
```

---

## 3. Gestão de Carência de 30 Dias

Quando um contrato atinge sua `data_termino`, ele entra em estado de **Carência de 30 Dias**:
- O saldo remanescente não expira de imediato.
- O cliente pode aprovar ciclos em andamento consumindo o saldo restante.
- Caso um novo contrato aditivo seja assinado dentro da carência, o saldo remanescente pode ser transferido ou aproveitado.