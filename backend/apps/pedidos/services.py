from django.db import transaction
from django.utils import timezone
from apps.pedidos.models import Pedido, StatusPedido

class PedidoService:
    @staticmethod
    def gerar_protocolo() -> str:
        import re
        hoje = timezone.localdate()
        prefixo = f"OS{hoje.year}{hoje.month:02d}"
        protocolos = Pedido.objects.filter(protocolo__startswith=prefixo).values_list("protocolo", flat=True)
        max_seq = 0
        pattern = re.compile(rf"^{re.escape(prefixo)}(\d+)$")
        for prot in protocolos:
            match = pattern.match(prot)
            if match:
                try:
                    num = int(match.group(1))
                    if num > max_seq:
                        max_seq = num
                except ValueError:
                    continue
        seq = max_seq + 1
        candidato = f"{prefixo}{seq:04d}"
        while Pedido.objects.filter(protocolo=candidato).exists():
            seq += 1
            candidato = f"{prefixo}{seq:04d}"
        return candidato

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