from decimal import Decimal

from shm.models.requests import Ciclo, Pedido
from shm.models.timeline import ComentarioTimeline
from shm.models.users import Usuario


class TimelineService:
    @staticmethod
    def registrar_evento(
        conteudo: str,
        tipo_evento: str = ComentarioTimeline.TipoEvento.COMENTARIO,
        pedido: Pedido | None = None,
        ciclo: Ciclo | None = None,
        autor: Usuario | None = None,
        horas_contexto: Decimal | None = None,
    ) -> ComentarioTimeline:
        """Registra um evento ou comentário na timeline de forma auditável."""
        # Se passado apenas o ciclo, associa automaticamente o pedido pai
        if ciclo and not pedido:
            pedido = ciclo.pedido

        evento = ComentarioTimeline.objects.create(
            pedido=pedido,
            ciclo=ciclo,
            autor=autor,
            tipo_evento=tipo_evento,
            conteudo=conteudo,
            horas_contexto=horas_contexto,
        )
        return evento
