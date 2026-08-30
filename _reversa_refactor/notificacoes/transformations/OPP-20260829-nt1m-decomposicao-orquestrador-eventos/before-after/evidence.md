# Evidencia Before/After - OPP-20260829-nt1m

> Transformacao: Decomposicao e Encapsulamento do Orquestrador de Ciclo de Vida  
> Contexto: `notificacoes`  
> Metodo de Preservacao: `tests`

---

## 1. Medicoes de Complexidade Estrutural

- **Antes:** Método `notificar_evento_ciclo` continha mais de 250 linhas, acumulando formatação de texto, roteamento por papel de usuário, regras de e-mail e botões CTA com alta complexidade ciclomática.
- **Depois:** Método principal reduzido para ~45 linhas de fluxo linear:
  1. `_montar_payload_evento_ciclo` (Mapeamento coeso de payload dos 8 eventos)
  2. `_obter_destinatarios_email_por_grupo` (Governança RBAC de e-mail)
  3. `notificar_evento_ciclo` (Orquestração linear)

---

## 2. Antes e Depois

### Antes
- Escadas paralelas de `if/elif` gerando redundâncias de variáveis locais e espalhando responsabilidades no mesmo corpo de função.

### Depois
- Separação clara entre a montagem de mensagens transacionais e a execução dos efeitos colaterais (timeline, notificações in-app e e-mails).
