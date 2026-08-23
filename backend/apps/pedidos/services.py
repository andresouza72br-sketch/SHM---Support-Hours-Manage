from django.db import transaction
from django.utils import timezone
from apps.pedidos.models import Pedido, StatusPedido

class PedidoService:
    @staticmethod
    def gerar_protocolo() -> str:
        hoje = timezone.localdate()
        prefixo = f"OS{hoje.year}{hoje.month:02d}"
        ultimo = Pedido.objects.filter(protocolo__startswith=prefixo).order_by("-protocolo").first()
        if ultimo:
            seq = int(ultimo.protocolo[-4:]) + 1
        else:
            seq = 1
        return f"{prefixo}{seq:04d}"

    @staticmethod
    @transaction.atomic
    def sincronizar_status_pedido(pedido: Pedido) -> None:
        from apps.ciclos.models import Ciclo, StatusCiclo
        ciclos = Ciclo.objects.filter(pedido=pedido)
        if not ciclos.exists():
            novo_status = StatusPedido.ABERTO
        elif ciclos.filter(status=StatusCiclo.AGUARDANDO_APROVACAO).exists():
            novo_status = StatusPedido.AGUARDANDO_APROVACAO
        elif ciclos.filter(status=StatusCiclo.AGUARDANDO_ACEITE).exists():
            novo_status = StatusPedido.AGUARDANDO_ACEITE
        elif ciclos.filter(status__in=[StatusCiclo.EM_EXECUCAO, StatusCiclo.APROVADO]).exists():
            novo_status = StatusPedido.EM_EXECUCAO
        elif ciclos.filter(status=StatusCiclo.ORCADO).exists():
            novo_status = StatusPedido.EM_ORCAMENTO
        elif not ciclos.exclude(status__in=[StatusCiclo.ACEITO, StatusCiclo.CANCELADO]).exists():
            novo_status = StatusPedido.CONCLUIDO
        else:
            novo_status = StatusPedido.ABERTO

        if pedido.status != novo_status:
            pedido.status = novo_status
            pedido.save(update_fields=["status", "atualizado_em"])