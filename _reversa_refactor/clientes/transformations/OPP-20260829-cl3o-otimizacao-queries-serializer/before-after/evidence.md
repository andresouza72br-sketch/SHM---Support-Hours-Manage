# Evidencias da Transformacao - OPP-20260829-cl3o

> Contexto: `clientes`  
> Oportunidade: `OPP-20260829-cl3o`  
> Data: 2026-08-29

---

## 1. Trecho Antes (em `ClienteSerializer`)

Consultas redundantes repetidas por campo e ignorando prefetch em memória:

```python
def get_aceite_token(self, obj):
    link = obj.aceite_links.order_by("-criado_em").first() # Query 1
    return str(link.token) if link else None

def get_aceite_expira_em(self, obj):
    link = obj.aceite_links.order_by("-criado_em").first() # Query 2 (idêntica)
    return link.data_expiracao.isoformat() if link else None

def get_aceite_usado(self, obj):
    link = obj.aceite_links.order_by("-criado_em").first() # Query 3 (idêntica)
    return link.usado if link else False
```

---

## 2. Trecho Depois (com cache de instância e prefetch em memória)

Reutilização inteligente de coleções pré-carregadas:

```python
def _get_ultimo_aceite_link(self, obj):
    if not hasattr(obj, "_cached_ultimo_aceite_link"):
        if hasattr(obj, "_prefetched_objects_cache") and "aceite_links" in obj._prefetched_objects_cache:
            links = sorted(obj.aceite_links.all(), key=lambda l: l.criado_em, reverse=True)
            obj._cached_ultimo_aceite_link = links[0] if links else None
        else:
            obj._cached_ultimo_aceite_link = obj.aceite_links.order_by("-criado_em").first()
    return obj._cached_ultimo_aceite_link

def get_aceite_token(self, obj):
    link = self._get_ultimo_aceite_link(obj)
    return str(link.token) if link else None
```

---

## 3. Ganhos de Desempenho e Complexidade

- **Complexidade de Queries:** Redução de $O(N \times 7)$ para $O(1)$ queries adicionais no endpoint de listagem de clientes (com `prefetch_related` ativo).
- **Consumo de Conexões:** Redução drástica de round-trips ao banco de dados PostgreSQL/SQLite durante renderização de tabelas e dashboards.
- **Equivalência Estrita de Saída:** Preservação de 100% dos tipos, formatos e chaves JSON retornadas pela API.
