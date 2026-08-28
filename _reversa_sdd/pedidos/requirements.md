# Requisitos do Módulo Pedidos

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Chamados de suporte técnico unificados, geração de protocolo sequencial `OSYYYYMMNNNN`, agrupador de ciclos e sincronização automática de status.

## 2. Requisitos Funcionais
- **RF-PED-01 (Must):** Gerar protocolo sequencial atômico `OSYYYYMMNNNN` na criação 🟢.
- **RF-PED-02 (Must):** Vincular pedido obrigatoriamente a Cliente e Contrato ativo ou em carência 🟢.
- **RF-PED-03 (Must):** Sincronizar status do pedido automaticamente em cascata conforme os ciclos associados 🟢.
