# ADR 001: Decomposição Atômica em Ciclos e Débito de Saldo no Aceite Formal

## Status
Aprovado / Implementado

## Contexto
Sistemas tradicionais de chamados e suporte debitam horas estimadas na abertura do chamado ou exigem fechamento manual no final do mês, gerando atrito financeiro com o cliente tomador quando o escopo muda ou o chamado sofre cancelamento parcial.

## Decisão
1. Decompor cada pedido de suporte em múltiplos ciclos atômicos classificados por especialidade (Corretiva, Evolutiva, Análise, etc.).
2. A aprovação de orçamento pelo cliente autoriza o início do trabalho técnico, mas **não consome saldo**.
3. O débito no ledger do contrato ocorre **exclusivamente no momento em que o cliente assina o Aceite Formal**, debitando as horas reais executadas nas tarefas.

## Consequências
- **Positivas:** Transparência total; eliminação de horas presas em chamados não executados; rastreabilidade precisa.
- **Mitigações:** Exige disciplina técnica no apontamento das tarefas reais.