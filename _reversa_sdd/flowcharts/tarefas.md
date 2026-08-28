# Fluxograma do Módulo Tarefas

```mermaid
flowchart TD
    A[Técnico Cria Tarefa no Ciclo] --> B[Define Descrição & Horas Estimadas]
    B --> C[Status: Prevista]
    C --> D[Técnico Executa o Serviço]
    D --> E[Informa Horas Realizadas & Marca como Realizada]
    E --> F[Tarefa.save()]
    F --> G[Somatório Automático de todas as Tarefas Realizadas do Ciclo]
    G --> H[Atualiza ciclo.horas_realizadas]
```
