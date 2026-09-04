import logging
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.pedidos.models import Pedido, StatusPedido, AnexoPedido
from apps.core.validators import validar_arquivo_anexo

logger = logging.getLogger(__name__)

class PedidoService:
    @staticmethod
    def gerar_protocolo() -> str:
        hoje = timezone.localdate()
        prefixo = f"OS{hoje.year}{hoje.month:02d}"
        ultimo_protocolo = (
            Pedido.objects.filter(protocolo__startswith=prefixo)
            .order_by("-protocolo")
            .values_list("protocolo", flat=True)
            .first()
        )
        seq = 1
        if ultimo_protocolo and len(ultimo_protocolo) > len(prefixo):
            sufixo = ultimo_protocolo[len(prefixo):]
            if sufixo.isdigit():
                seq = int(sufixo) + 1

        candidato = f"{prefixo}{seq:04d}"
        while Pedido.objects.filter(protocolo=candidato).exists():
            seq += 1
            candidato = f"{prefixo}{seq:04d}"
        return candidato

    @staticmethod
    def resolver_cliente_para_pedido(usuario, contrato=None):
        """Resolve o cliente titular do pedido a partir do usuário ou contrato."""
        if hasattr(usuario, "is_cliente") and usuario.is_cliente and getattr(usuario, "cliente", None):
            return usuario.cliente
        if contrato and hasattr(contrato, "cliente") and contrato.cliente:
            return contrato.cliente
        return None

    @staticmethod
    @transaction.atomic
    def criar_pedido(
        contrato,
        assunto: str,
        descricao: str,
        usuario,
        prioridade: str = "media",
        cliente=None,
        arquivos=None,
    ) -> Pedido:
        """
        Cria um novo pedido de suporte com protocolo sequencial OSYYYYMMNNNN,
        vincula o cliente correto, armazena até 10 arquivos anexos e dispara evento de notificação.
        """
        if arquivos:
            if len(arquivos) > 10:
                raise ValidationError("Limite máximo de 10 arquivos por pedido excedido.")
            for arq in arquivos:
                validar_arquivo_anexo(arq)

        if not cliente:
            cliente = PedidoService.resolver_cliente_para_pedido(usuario, contrato)

        protocolo = PedidoService.gerar_protocolo()
        pedido = Pedido.objects.create(
            protocolo=protocolo,
            contrato=contrato,
            cliente=cliente,
            assunto=assunto,
            descricao=descricao,
            prioridade=prioridade,
            criado_por=usuario,
            status=StatusPedido.ABERTO,
        )

        if arquivos:
            for arq in arquivos:
                AnexoPedido.objects.create(
                    pedido=pedido,
                    arquivo=arq,
                    nome_original=getattr(arq, "name", "anexo"),
                    tamanho=getattr(arq, "size", 0),
                    criado_por=usuario,
                )

        try:
            from apps.notificacoes.services import NotificacaoService
            NotificacaoService.notificar_novo_pedido(pedido)
        except Exception as e:
            logger.warning("Falha ao disparar notificação de novo pedido #%s: %s", pedido.protocolo, e, exc_info=True)
        return pedido

    @staticmethod
    @transaction.atomic
    def adicionar_anexos_ao_pedido(pedido: Pedido, arquivos: list, usuario) -> list:
        """Adiciona arquivos a um pedido existente respeitando o teto de 10 anexos totais."""
        if not arquivos:
            return []
        total_atual = pedido.anexos.count()
        if total_atual + len(arquivos) > 10:
            raise ValidationError(
                f"O pedido já possui {total_atual} anexo(s). Com os {len(arquivos)} enviados, ultrapassaria o limite máximo de 10 anexos."
            )
        anexos_criados = []
        for arq in arquivos:
            validar_arquivo_anexo(arq)
            anexo = AnexoPedido.objects.create(
                pedido=pedido,
                arquivo=arq,
                nome_original=getattr(arq, "name", "anexo"),
                tamanho=getattr(arq, "size", 0),
                criado_por=usuario,
            )
            anexos_criados.append(anexo)
        return anexos_criados

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