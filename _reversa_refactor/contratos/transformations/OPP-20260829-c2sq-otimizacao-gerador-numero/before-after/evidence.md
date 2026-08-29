# Evidência de Desempenho e Memória - OPP-20260829-c2sq

> Contexto: `contratos`  
> Verbo: `optimize`  
> Método de Preservação: `tests` (Equivalência determinística do algoritmo de numbering)

---

## 1. Métricas de Eficiência

| Métrica | Antes | Depois | Ganho Comprovado |
|---|---|---|---|
| **Alocação de Memória** | Lista com $N$ registros em memória | 1 único valor escalar | **$O(1)$ Memória** |
| **Execuções de Regex em Loop** | $N$ iterações por chamada | 1 única avaliação | **$O(1)$ CPU** |
| **Cláusula SQL Gerada** | `SELECT ... FROM shm_contrato WHERE numero LIKE 'CT-YYYY-%'` | `SELECT ... FROM shm_contrato WHERE numero LIKE 'CT-YYYY-%' ORDER BY numero DESC LIMIT 1` | **Index Scan com LIMIT 1** |
| **Determinismo do Número Gerado** | Sequencial estrito (`CT-YYYY-XXXX`) | Sequencial estrito (`CT-YYYY-XXXX`) | **100% Idêntico** |

---

## 2. Equivalência Funcional

1. **Geração Inicial:** Sem contratos no ano, gera `CT-YYYY-0001`.
2. **Geração Subsequente:** Com `CT-YYYY-0005` existente, gera `CT-YYYY-0006`.
3. **Resiliência a Colisões:** Preservado o guard de verificação `Contrato.objects.filter(numero=candidato).exists()`.
