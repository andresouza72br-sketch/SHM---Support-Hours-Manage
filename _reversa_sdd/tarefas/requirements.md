# Requisitos do Módulo Tarefas

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Apontamentos granulares de horas e serviços técnicos executados dentro de um ciclo.

## 2. Requisitos Funcionais
- **RF-TAR-01 (Must):** Criar tarefas vinculadas a um ciclo com `horas_estimadas` e `horas_realizadas` 🟢.
- **RF-TAR-02 (Must):** Ao salvar ou deletar uma tarefa com status `realizada`, recalcular atômicamente o campo `ciclo.horas_realizadas` 🟢.
