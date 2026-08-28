# Requisitos do Módulo Accounts

> Gerado pelo **Reversa Writer** em 2026-08-27  
> Confiança: 🟢 CONFIRMADO

## 1. Visão Geral
Módulo responsável pela autenticação de usuários, gestão de perfis de acesso RBAC (Empresa vs Cliente), login por Magic Link sem senha e autenticação Single Sign-On com Google OAuth.

## 2. Requisitos Funcionais
- **RF-ACC-01 (Must):** Autenticar usuários via JWT com Access Token (60 min) e Refresh Token rotativo (7 dias) 🟢.
- **RF-ACC-02 (Must):** Suportar 4 papéis de acesso: `EMPRESA_ADMIN`, `EMPRESA_TECNICO`, `CLIENTE_GERENTE`, `CLIENTE_ANALISTA` 🟢.
- **RF-ACC-03 (Should):** Gerar Magic Login Link UUIDv4 sem senha para acesso direto por e-mail 🟢.
- **RF-ACC-04 (Should):** Permitir login via Google OAuth 2.0 validando o ID Token emitido pelo Google e sincronizando `avatar_url` 🟢.

## 3. Critérios de Aceitação
```gherkin
Cenário: Login bem-sucedido com JWT
  Dado que o usuário envia username e senha válidos para /api/v1/auth/login/
  Quando a requisição for processada
  Então o sistema retorna 200 OK com access token, refresh token e dados do usuário.

Cenário: Tentativa de login com senha inválida
  Dado que o usuário envia senha incorreta
  Quando a requisição for processada
  Então o sistema retorna 401 Unauthorized com mensagem de credenciais inválidas.
```
