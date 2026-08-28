# Diagrama C4 — Containers (Nível 2)

```mermaid
C4Container
    title Diagrama C4 de Containers — SHM 2.4

    Person(users, "Usuários (Empresa & Clientes)", "Acessam o sistema via navegador web ou smartphones.")

    Container(spa, "Single-Page Application (SPA)", "React 19, TypeScript, Vite, Tailwind CSS", "Interface web reativa com Kanban, Carrossel de Ciclos e Modais.")
    Container(api, "Backend API REST", "Python 5.2, Django REST Framework, SimpleJWT", "Endpoints RESTful, regras de negócio e controle de saldo.")
    ContainerDb(db, "Banco de Dados Relacional", "PostgreSQL / SQLite3", "Armazena cadastros, contratos, ledger de saldo e histórico.")

    Rel(users, spa, "Utiliza", "HTTPS")
    Rel(spa, api, "Chamadas de API / JSON", "HTTPS / JWT")
    Rel(api, db, "Lê e escreve dados", "Django ORM / SQL")
```