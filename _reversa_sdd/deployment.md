# Especificação de Infraestrutura e Deployment — SHM 2.5.0

> Gerado pelo **Reversa Architect** em 2026-09-03  
> Sistema: **SHM 2.5.0 (Support Hours Manager)**

---

## 1. Topologia de Ambientes

```
[Ambiente Local / Desenvolvimento]
- Backend: Django dev server (Python 3.12+, uv) rodando em http://localhost:8000
- Frontend: Vite dev server (Node/Bun) rodando em http://localhost:5173
- Banco: SQLite3 local (backend/db.sqlite3)
- Servidor de E-mail: Mock SMTP local (tools/mail-server/dev_mail_server.py) em localhost:1025 / WebUI localhost:8025
- Orquestrador: Script dev.ps1 ou dev.bat (inicia backend e frontend em janelas coordenadas)

[Ambiente de Produção / Cloud]
- Backend: Gunicorn / ASGI Server rodando por trás de Nginx / Reverse Proxy
- Frontend: SPA compilado estático (Vite build -> /dist/) servido via CDN / Nginx
- Banco de Dados: PostgreSQL 15+ com pool de conexões e SSL
- Storage de Documentos: Volume persistente criptografado / S3-compatible Object Storage
- E-mail: Provedor SMTP transacional (Amazon SES, SendGrid, Postmark)
```

---

## 2. Variáveis de Ambiente Críticas

| Variável | Contexto | Descrição |
|---|---|---|
| `SECRET_KEY` | Backend | Chave criptográfica Django |
| `DEBUG` | Backend | Flag de depuração (False em produção) |
| `ALLOWED_HOSTS` | Backend | Domínios permitidos |
| `DATABASE_URL` | Backend | URL de conexão PostgreSQL |
| `CORS_ALLOWED_ORIGINS` | Backend | Domínios frontend autorizados |
| `GOOGLE_CLIENT_ID` | Backend | Client ID do Google OAuth 2.0 |
| `EMAIL_HOST` / `EMAIL_PORT` | Backend | Configurações SMTP |
| `VITE_API_URL` | Frontend | Endpoint base da API REST backend |
