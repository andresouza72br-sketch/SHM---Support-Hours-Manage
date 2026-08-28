# Fluxograma do Módulo Comunicação

```mermaid
flowchart TD
    A[Usuário Publica Comentário] --> B{Tem Parent ID?}
    B -- Sim --> C[Cria como Resposta Aninhada em Árvore]
    B -- Não --> D[Cria Comentário Raiz no Ciclo ou Tarefa]
    C --> E[Dispara Notificação aos Participantes]
    D --> E
    E --> F[Usuários Podem Reagir com Emojis (Toggle)]
    E --> G[Técnico Pode Converter Comentário em Tarefa Direta]
```
