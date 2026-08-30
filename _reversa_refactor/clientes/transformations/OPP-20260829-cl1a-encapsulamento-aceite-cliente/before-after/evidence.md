# Evidencias da Transformacao - OPP-20260829-cl1a

> Contexto: `clientes`  
> Oportunidade: `OPP-20260829-cl1a`  
> Data: 2026-08-29

---

## 1. Trecho Antes (em `AceiteClienteView.post`)

A lógica de transição cadastral e notificações in-app era realizada diretamente dentro da View HTTP sem proteção transacional atômica:

```python
link = ClienteAceiteLink.objects.select_related("cliente").filter(token=token).first()
# ...
link.usado = True
link.usado_em = agora
link.save(...)

cliente = link.cliente
cliente.status = StatusCliente.ATIVO
cliente.aprovado_em = agora
cliente.email_verificado = True
cliente.save(...)

empresa_users = User.objects.filter(...)
Notification.objects.bulk_create(...)
```

---

## 2. Trecho Depois (com `ClienteService.formalizar_aceite`)

Encapsulado na camada de serviço com decorator `@transaction.atomic`:

```python
# apps/clientes/services.py
class ClienteService:
    @staticmethod
    @transaction.atomic
    def formalizar_aceite(token: str, ip: str = None, user_agent: str = None) -> tuple[Cliente | None, ClienteAceiteLink | None, int, str]:
        # Validação de token, expiração de 7 dias e idempotência
        # Mutação de link e ativação de cliente
        # Criação de notificações internas
        # Retorno atômico e desacoplado

# apps/clientes/views.py (AceiteClienteView.post)
cliente, link, status_code, msg = ClienteService.formalizar_aceite(token=token, ip=ip, user_agent=ua)
if status_code != 200:
    return Response({"detail": msg}, status=status_code)
```

---

## 3. Ganhos Estruturais

- **Atomicidade Transacional:** Toda a operação (link, cliente e notificações) é executada em uma única transação de banco de dados (`@transaction.atomic`), eliminando risco de estado corrompido em falhas transitórias.
- **Isolamento de Responsabilidades:** A View HTTP agora atua estritamente no parsing de requisições e respostas JSON.
- **Reusabilidade:** A formalização de aceite agora pode ser invocada por outros fluxos ou rotinas sem dependência de classes da camada de apresentação REST.
