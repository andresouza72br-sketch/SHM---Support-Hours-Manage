# Requisitos do Módulo Frontend

> Gerado pelo **Reversa Writer** em 2026-09-03  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Single Page Application (SPA) em React 19, TypeScript e Tailwind CSS, orientada a componentes modulares, consumo assíncrono via TanStack Query e suporte a fluxos autenticados e telas públicas de Magic Link.

## 2. Requisitos Funcionais
- **RF-FRT-01 (Must):** Autenticação JWT com auto-refresh transparente via interceptors Axios 🟢.
- **RF-FRT-02 (Must):** Telas públicas de Magic Link para aprovação cadastral, aprovação de orçamento, aceite de ciclo e confirmação de opt-in de notificação 🟢.
- **RF-FRT-03 (Must):** Modal de Migração e Compensação de Saldo (`MigracaoSaldoModal`) com pré-visualização contábil em tempo real e validação de saldos 🟢.
- **RF-FRT-04 (Must):** Modal de Documentos Contratuais (`DocumentosContratoModal`) com exibição do hash SHA-256 e status de integridade 🟢.
- **RF-FRT-05 (Must):** Painel de Gestão de Notificações (`ConfiguracoesNotificacoesPage`) com switches para ativação de canais e papéis 🟢.
- **RF-FRT-06 (Must):** Cockpit Executivo (`AdminDashboardPage`) e Extrato Financeiro de Horas (`ExtratoContratoPage`) 🟢.
- **RF-FRT-07 (Must):** Kanban Board com sincronização de status de chamados em tempo real 🟢.
- **RF-FRT-08 (Must):** Página de Documentação da Auditoria Forense e Imutabilidade (`DocumentacaoAuditoriaPage`), acessível tanto pelo painel administrativo quanto em rota pública aberta (`/publico/auditoria-forense`) para peritos judiciais e autoridades 🟢.
- **RF-FRT-09 (Must):** Sumário lateral da documentação (`DocumentacaoSidebarTOC`) posicionado de forma **flutuante fixa e centralizada verticalmente** na viewport (`max(5rem, calc(50vh - halfHeight))`), com rolagem suave calculada sem sobreposição de cabeçalho e trava anti-jitter no Scrollspy 🟢.
- **RF-FRT-10 (Must):** Disponibilização e download direto em 1 clique do código-fonte do utilitário pericial autônomo offline em Python puro (`verificador_independente.py`) com zero dependências externas (`pip`) 🟢.

