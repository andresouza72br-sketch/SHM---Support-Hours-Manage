# Design do Módulo Comunicação

## 1. Modelos
- `Comentario`: ciclo (FK), tarefa (FK), autor (FK), texto, parent (FK recursiva), tarefa_convertida (FK).
- `AnexoComentario`: comentario (FK), arquivo, nome_original, tamanho.
- `ReacaoComentario`: comentario (FK), autor (FK), tipo (`unique_together = [['comentario', 'autor', 'tipo']]`).
