# Visão Geral da Arquitetura — SHM 2.5

> Especificação arquitetural estruturada pelo **Framework Reversa** (Metodologia Spec-Driven Development / SDD concebida pelo **Prof. Sandeco Macedo**) em 2026-08-27.

---

## 1. Princípios Arquiteturais

O SHM 2.5 adota **Clean Architecture**, **Domain-Driven Design (DDD)** e **Ledger Forense Imutável** no Django, com divisão clara entre a camada de domínio, serviços de aplicação e cliente Frontend SPA em React 19.

### Componentes Principais
1. **Camada de Apresentação (Frontend):** React 19 SPA, TypeScript, Vite, Tailwind CSS, TanStack Query, componentes atômicos e conciliação visual no Extrato Oficial.
2. **Camada de API RESTful (Backend):** Django REST Framework com autenticação JWT (SimpleJWT), serialização rigorosa e transações atômicas (`@transaction.atomic`).
3. **Camada de Negócio & Serviços (Services):** `CicloService`, `PedidoService`, `SaldoService` (Migração e Compensação de Débito com trava de teto), `NotificacaoService`, `ContratoEmailNotificacaoService`.
4. **Camada de Persistência:** Django ORM com suporte a PostgreSQL em produção e SQLite3 local.
5. **Auditoria & Segurança Forense:** Hashes criptográficos SHA-256 em documentos, Livro-Razão Forense (`HistoricoSaldo`), Trilha de Auditoria Dupla (`ContratoAuditLog`), Magic Links criptográficos com validação de expiração.