# Evidencias da Transformacao - OPP-20260829-cl2e

> Contexto: `clientes`  
> Oportunidade: `OPP-20260829-cl2e`  
> Data: 2026-08-29

---

## 1. Trecho Antes (em `ClienteViewSet._executar_exclusao_cliente`)

O fluxo de exclusão realizava validações de integridade referencial, criação de logs e deleção física acopladas dentro da View REST:

```python
total_contratos = cliente.contratos.count() ...
if total_contratos > 0:
    raise ValidationError({"detail": ...})

if not justificativa or len(justificativa) < 5:
    raise ValidationError({"justificativa": ...})

ClienteAuditLog.objects.create(...)
Notification.objects.bulk_create(...)
cliente.delete()
```

---

## 2. Trecho Depois (com `ClienteService.excluir_cliente`)

Centralizado em método de serviço com `@transaction.atomic`:

```python
# apps/clientes/services.py
class ClienteService:
    @staticmethod
    @transaction.atomic
    def excluir_cliente(
        cliente: Cliente,
        justificativa: str,
        usuario: User = None,
        ip: str = None,
        user_agent: str = None,
    ) -> tuple[str, str]:
        # Validação de integridade (contratos / pedidos)
        # Validação de justificativa
        # Gravação em ClienteAuditLog (TipoEventoClienteAudit.EXCLUSAO)
        # Notificações em lote para administradores
        # cliente.delete()

# apps/clientes/views.py (ClienteViewSet._executar_exclusao_cliente)
nome_cliente, justificativa_limpa = ClienteService.excluir_cliente(
    cliente=cliente,
    justificativa=justificativa,
    usuario=request.user,
    ip=ip,
    user_agent=ua,
)
```

---

## 3. Ganhos Estruturais

- **Integridade Transacional e Forense:** A exclusão física só ocorre se a auditoria indelével for persistida com sucesso e os vínculos de negócio forem rigorosamente validados.
- **Camada de Apresentação Limpa:** A View fica responsável apenas pela extração de argumentos da requisição e envio de status HTTP 200.
- **Reusabilidade de Governança:** Qualquer rotina de manutenção ou comando administrativo pode invocar `ClienteService.excluir_cliente` mantendo as mesmas regras de integridade jurídica e contábil.
