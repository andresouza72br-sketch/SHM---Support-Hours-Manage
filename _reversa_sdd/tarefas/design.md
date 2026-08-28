# Design do Módulo Tarefas

## 1. Modelos
- `Tarefa`: ciclo (FK), descricao, horas_estimadas, horas_realizadas, status (`prevista`, `realizada`, `cancelada`), operador (FK).
- Métodos `save()` e `delete()` sobrescritos para somar tarefas realizadas e atualizar o ciclo pai.
