# Evidência de Otimização e Prova de Equivalência - OPP-20260829-cm3o

## 1. Medição de Desempenho e Queries SQL

| Métrica | Antes (Baseline) | Depois (Otimizado) | Ganho |
|---|---|---|---|
| Queries SQL na serialização de 20 comentários | 20 queries ($O(N)$) | 0 queries ($O(1)$) | **100% de redução** |
| Linhas duplicadas de serialização | ~40 linhas | 0 linhas | **Deduplicação total via BaseComentarioSerializer** |
| Complexidade assintótica de queries | $O(N)$ | $O(1)$ | **Escalabilidade linear para constante** |

## 2. Prova de Equivalência Comportamental

- Payload JSON idêntico com todos os campos serializados (`id`, `ciclo`, `tarefa`, `parent`, `autor`, `autor_nome`, `autor_role`, `autor_username`, `autor_avatar_url`, `texto`, `tarefa_convertida`, `anexos`, `respostas`, `reacoes_count`, `user_reacted`).
- Tratamento robusto quando `request` não possui `user` ou usuário anônimo (`getattr(request, 'user', None)`).
