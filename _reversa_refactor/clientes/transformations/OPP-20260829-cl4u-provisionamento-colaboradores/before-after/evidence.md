# Evidencias da Transformacao - OPP-20260829-cl4u

> Contexto: `clientes`  
> Oportunidade: `OPP-20260829-cl4u`  
> Data: 2026-08-29

---

## 1. Trecho Antes (em `ClienteViewSet`)

Lógica de sanitização de username, geração de credencial aleatória, tokens temporários e envio de e-mails embutida na View:

```python
username_base = email.split("@")[0]...
while User.objects.filter(username=username).exists():
    username = f"{username_base}_{counter}"
    counter += 1

senha_temp = secrets.token_urlsafe(12)
novo_user = User.objects.create(...)
token_obj = PasswordlessLoginToken.objects.create(...)
ClienteUsuarioEmailService.enviar_convite_usuario(...)
```

---

## 2. Trecho Depois (com `ClienteService.criar_colaborador_com_convite`)

Modularizado em método coeso de serviço com `@transaction.atomic`:

```python
# apps/clientes/services.py
class ClienteService:
    @staticmethod
    @transaction.atomic
    def criar_colaborador_com_convite(
        cliente: Cliente,
        dados: dict,
        convidador: User = None,
    ) -> tuple[User, PasswordlessLoginToken, bool]:
        # Geração de username único determinístico
        # Criação de User e senha temporária segura
        # Emissão de PasswordlessLoginToken de 48h
        # Disparo de e-mail de boas-vindas

# apps/clientes/views.py (ClienteViewSet.usuarios POST)
novo_user, token_obj, email_enviado = ClienteService.criar_colaborador_com_convite(
    cliente=cliente,
    dados=data,
    convidador=request.user,
)
```

---

## 3. Ganhos Estruturais e de Coesão

- **Fronteiras Claras de Responsabilidade:** A camada de API REST trata exclusivamente de permissões HTTP e validação de schema de entrada (`ClienteUserCreateSerializer`), delegando o ciclo de vida de identidades à camada de domínio.
- **Reusabilidade de Onboarding:** Outros fluxos (ex: migrações de dados, importações CSV em lote ou rotinas de integração) podem provisionar colaboradores com as mesmas garantias de unicidade e envio de Magic Link sem acoplamento à camada web.
