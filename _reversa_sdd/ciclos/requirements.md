# Requisitos do Módulo Ciclos

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO & HOMOLOGADO

## 1. Visão Geral
Coração operacional do SHM: decomposição atômica de pedidos em ciclos especializados, orçamentação, execução, aceite formal com débito exclusivo de horas reais, controle de tolerância e avaliação pós-aceite.

## 2. Requisitos Funcionais
- **RF-CIC-01 (Must):** Decompor pedidos em ciclos classificados (`corretiva`, `evolutiva`, `preventiva`, `analise`, `consultoria`, `treinamento`, `teste`) 🟢.
- **RF-CIC-02 (Must):** Apresentação de orçamento gera Magic Link UUIDv4 de 7 dias 🟢.
- **RF-CIC-03 (Must):** Aprovação de orçamento **não debita saldo** do contrato 🟢.
- **RF-CIC-04 (Must):** Aceite formal pelo cliente debita **exclusivamente as horas reais realizadas** no contrato 🟢.
- **RF-CIC-05 (Must):** **Política de Tolerância de 30%:** Permitir aceite de horas realizadas até 30% acima de `horas_estimadas`. Se `horas_realizadas > horas_estimadas * 1.30`, travar o aceite e exigir aprovação prévia de aditivo de escopo/orçamento 🟢.
- **RF-CIC-06 (Should):** Disparar avaliação de satisfação (1-5 estrelas + feedback textual) após o aceite formal 🟢.

## 3. Critérios de Aceitação
```gherkin
Cenário: Aceite com horas dentro da tolerância de 30%
  Dado que o ciclo foi orçado em 10.00h e aprovado pelo cliente
  E as tarefas somaram 12.50h realizadas (25% de acréscimo)
  Quando o cliente concede o aceite formal
  Então o sistema permite a conclusão e debita 12.50h no saldo do contrato.

Cenário: Bloqueio de aceite com horas excedendo 30%
  Dado que o ciclo foi orçado em 10.00h e aprovado pelo cliente
  E as tarefas somaram 14.00h realizadas (40% de acréscimo)
  Quando o cliente tenta conceder o aceite
  Então o sistema bloqueia a transação com mensagem de limite de tolerância excedido (>30%) e exige aditivo de horas.
```
