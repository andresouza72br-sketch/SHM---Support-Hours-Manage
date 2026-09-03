# Contratos de API — Accounts

## POST /api/v1/auth/login/
**Request:** `{"username": "admin", "password": "admin123"}`  
**Response 200:** `{"access": "...", "refresh": "...", "user": {"id": 1, "username": "admin", "role": "EMPRESA_ADMIN"}}`
