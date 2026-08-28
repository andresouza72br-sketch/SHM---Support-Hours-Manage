# Lacunas Técnicas, Débitos e Roadmap de Evolução (Gaps & Roadmap)

> Gerado pelo **Reversa Reviewer** em 2026-08-27  
> Atualizado após homologação das decisões de negócio.

---

## 1. Débitos Técnicos do Legado

| ID | Módulo | Severidade | Descrição da Lacuna | Recomendação |
|---|---|:---:|---|---|
| **GAP-01** | `contratos` | Média | Armazenamento local de arquivos anexados (`MEDIA_ROOT`). | Migrar para storage de objetos (S3 / Cloud Storage / MinIO) com presigned URLs seguras. |
| **GAP-02** | `ciclos` | Baixa | Ausência de limitação de tentativas para Magic Link inválido. | Implementar rate limit por IP (ex: `django-ratelimit`) para mitigar ataques de força bruta no endpoint público. |
| **GAP-03** | `saldo` | Média | Reversão de operações via estorno é manual. | Criar endpoint de estorno atômico vinculado ao `HistoricoSaldo` para auditabilidade direta. |
| **GAP-04** | `frontend` | Baixa | Bundle inicial do Vite pode ser otimizado via lazy-loading das 14 rotas. | Implementar `React.lazy()` e `Suspense` em todas as rotas filhas do router. |

---

## 2. Roadmap de Novas Funcionalidades (Backlog Futuro)

| ID | Módulo | Prioridade | Funcionalidade Futura | Descrição Técnica |
|---|---|:---:|---|---|
| **FEAT-ROAD-01** | `notificacoes` | Alta | Notificações via Telegram Bot | Integração com Telegram Bot API para envio de alertas de chamado e botões inline de aprovação rápida. |
| **FEAT-ROAD-02** | `notificacoes` | Média | Notificações via WhatsApp Business | Disparo de mensagens transacionais e links via WhatsApp Business API / Webhooks. |
| **FEAT-ROAD-03** | `contratos` | Alta | Assistente de Migração de Saldo | Modal na criação de contratos detectando saldo de contratos vencidos do cliente e efetuando crédito automático. |
| **FEAT-ROAD-04** | `ciclos` | Alta | Trava de Tolerância de 30% | Bloqueio sistêmico de aceite se `horas_realizadas > horas_estimadas * 1.30`. |
