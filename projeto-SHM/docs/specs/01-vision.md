# 01 - Visão do Produto (SHM - Support Hours Manager)

## 1. Contexto e Problema

Empresas de desenvolvimento de software e prestadoras de serviços de TI frequentemente enfrentam atrito na gestão de suporte técnico contratado:
- **Falta de transparência**: Clientes questionam como e onde suas horas contratadas foram consumidas.
- **Desorganização operacional**: Demandas chegam por e-mails, mensagens e reuniões sem estimativa clara e sem decomposição em escopos controláveis.
- **Dificuldade na renovação**: Saldos remanescentes ou horas extras não são geridos com clareza, gerando insegurança comercial no momento de fechar novos contratos.
- **Controle fragmentado**: Planilhas manuais geram divergências entre a contabilidade interna da empresa e a percepção do cliente.

## 2. Proposta de Valor

O **SHM (Support Hours Manager)** é um SaaS B2B projetado para trazer clareza e previsibilidade à prestação de suporte técnico por horas.

O cerne do produto é:
> **Controle transparente e auditável de horas contratadas vs. horas consumidas através de ciclos de execução formalmente orçados, executados e aceitos pelo cliente.**

## 3. Pilares Estratégicos

1. **Decomposição Inteligente de Demandas**:
   - Um pedido aberto pelo cliente pode conter múltiplos assuntos. O sistema permite decompor um único pedido em $N$ ciclos independentes (ex: Manutenção Corretiva, Manutenção Evolutiva, Consultoria/Treinamento).
2. **Ciclo Formal com Aceite**:
   - Cada ciclo possui estimativa prévia de horas (orçamento), aprovação do cliente, execução de tarefas detalhadas e aceite formal de entrega antes da dedução do saldo.
3. **Gestão Flexível de Saldos e Rollover**:
   - Consumo baseado nas **horas efetivamente realizadas**.
   - Suporte a **saldo negativo** (permitindo continuidade operacional de emergência com posterior cobrança avulsa ou débito em novo contrato).
   - Rollover de saldo remanescente ou devedor para novos contratos com prazo padrão de 30 dias e flexibilidade de prorrogação administrativa.
4. **Timeline e Registro Histórico**:
   - Registro temporal de cada evento, comentário, ajuste de horas, aprovação e aceite, funcionando como histórico contratual auditável.
5. **Portais Dedicados**:
   - **Dashboard do Cliente**: Visão executiva em tempo real do saldo de horas, ciclos em aprovação, ciclos em andamento e histórico de aceites.
   - **Dashboard da Empresa**: Visão operacional de horas contratadas, horas alocadas, técnicos em atividade, pedidos pendentes e contratos próximos do vencimento.
