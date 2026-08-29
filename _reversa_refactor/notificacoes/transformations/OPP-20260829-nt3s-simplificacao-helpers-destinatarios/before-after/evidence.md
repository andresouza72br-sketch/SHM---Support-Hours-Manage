# Evidencia Before/After - OPP-20260829-nt3s

> Transformacao: Simplificacao e Unificacao de Helpers de Destinatarios e Origem  
> Contexto: `notificacoes`  
> Metodo de Preservacao: `equivalence-proof`

---

## 1. Medicoes de Complexidade e Redundancia

- **Linhas Duplicadas Eliminadas:** ~55 linhas.
- **Complexidade Ciclomática:** Reduzida pelo isolamento da busca de usuários e deduplicação de sets em `_obter_destinatarios_envolvidos`.
- **Helpers Criados:**
  - `_obter_info_autor_e_origem(autor, cliente)`
  - `_obter_destinatarios_envolvidos(pedido, ciclo=None, autor=None)`

---

## 2. Antes e Depois

### Antes
- Cada método montava sua própria consulta de `User.objects.filter(...)` para clientes e empresa, além de repetir lógica condicional de verificação de `cliente.nome_fantasia` vs `razao_social`.

### Depois
- Invocação uniforme de `_obter_info_autor_e_origem` e `_obter_destinatarios_envolvidos`, garantindo consistência em toda a emissão de notificações do sistema.
