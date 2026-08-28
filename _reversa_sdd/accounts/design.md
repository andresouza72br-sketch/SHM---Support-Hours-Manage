# Design do Módulo Accounts

## 1. Estrutura de Classes e Modelos
- `User` herda de `AbstractUser` e adiciona `role`, `telefone`, `avatar_url` e `cliente` (FK).
- `PasswordlessLoginToken`: `token` (UUIDv4), `expira_em`, `usado`, `ip_origem`, `user_agent`.

## 2. Endpoints e Rotas
- `POST /api/v1/auth/login/`: Autenticação por credenciais.
- `POST /api/v1/auth/refresh/`: Renovação de token JWT.
- `POST /api/v1/auth/magic-login/`: Emissão de token sem senha.
- `POST /api/v1/auth/magic-login/confirmar/`: Troca de token por JWT.
- `POST /api/v1/auth/google/`: Validação de ID Token Google.
- `GET /api/v1/auth/me/`: Perfil do usuário autenticado.
