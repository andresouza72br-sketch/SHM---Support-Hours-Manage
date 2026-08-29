# Evidencia Before/After - OPP-20260829-nt2d

> Transformacao: Modularizacao do Template HTML de E-mails Transacionais  
> Contexto: `notificacoes`  
> Metodo de Preservacao: `tests`

---

## 1. Medicoes de Coesao e Responsabilidade

- **Antes:** `NotificacaoService` acumulava lógica de transporte SMTP com string literals de HTML/CSS (~55 linhas de marcação visual).
- **Depois:** Criação de `backend/apps/notificacoes/email_templates.py`, contendo `renderizar_email_transacional()`.
- **Redução em `services.py`:** Redução de 50 linhas em `_enviar_email`, transformando o método em uma chamada de alto nível.

---

## 2. Interface Exposta

- `email_templates.py`:
  - `renderizar_email_transacional(assunto: str, mensagem_texto: str, link_final: str = None, cta_texto: str = None) -> str`
