# Diagrama C4 — Contexto do Sistema (Nível 1)

```mermaid
C4Context
    title Diagrama C4 de Contexto — SHM 2.4

    Person(empresa_admin, "Administrador Prestador", "Gerencia contratos, saldo, faturamento e clientes.")
    Person(empresa_tecnico, "Técnico Suporte", "Realiza triagem, orçamentos e executa tarefas.")
    Person(cliente_gerente, "Gerente Tomador (Cliente)", "Aprova orçamentos, concede aceites e avalia ciclos.")
    Person(cliente_analista, "Analista Solicitante", "Abre chamados e interage nos comentários.")

    System(shm_system, "SHM — Support Hours Manager", "Plataforma de governança, workflow atômico, ledger de saldo e aprovações.")

    System_Ext(smtp_server, "Servidor SMTP / E-mail", "Disparo de convites, Magic Links e notificações.")
    System_Ext(google_auth, "Google Identity Services", "Autenticação Single Sign-On (OAuth 2.0).")

    Rel(empresa_admin, shm_system, "Administra", "HTTPS / Web SPA")
    Rel(empresa_tecnico, shm_system, "Opera atendimentos", "HTTPS / Web SPA")
    Rel(cliente_gerente, shm_system, "Aprova orçamentos e aceites", "HTTPS / Magic Link / Web SPA")
    Rel(cliente_analista, shm_system, "Abre chamados", "HTTPS / Web SPA")

    Rel(shm_system, smtp_server, "Envia e-mails transacionais", "SMTP / TLS")
    Rel(shm_system, google_auth, "Valida ID Tokens", "HTTPS / REST")
```