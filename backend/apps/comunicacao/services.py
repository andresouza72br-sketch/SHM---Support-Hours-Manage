import logging
from decimal import Decimal
from django.db import transaction
from apps.comunicacao.models import Comentario, ReacaoComentario
from apps.tarefas.models import Tarefa, StatusTarefa

logger = logging.getLogger(__name__)


class ComentarioService:
    """Camada de serviço isolada para operações de comunicação e comentários."""

    @staticmethod
    def criar_comentario(serializer, autor):
        """Salva o comentário associando o autor e despacha notificações de forma resiliente."""
        comentario = serializer.save(autor=autor)
        try:
            from apps.notificacoes.services import NotificacaoService
            NotificacaoService.notificar_novo_comentario(comentario)
        except Exception:
            logger.warning(
                "Falha ao despachar notificação para comentário %s",
                comentario.id,
                exc_info=True,
            )
        return comentario

    @staticmethod
    def toggle_reacao(comentario, autor, tipo="like"):
        """Toggle idempotente de reação (cria ou remove). Retorna tupla (acao, tipo, total_reacoes, reagiu)."""
        reacao, created = ReacaoComentario.objects.get_or_create(
            comentario=comentario,
            autor=autor,
            tipo=tipo,
        )
        if not created:
            reacao.delete()
            acao = "removida"
            user_reacted = False
        else:
            acao = "adicionada"
            user_reacted = True

        total_reacoes = comentario.reacoes.count()
        return acao, tipo, total_reacoes, user_reacted

    @staticmethod
    def converter_em_tarefa(comentario, operador, descricao=None, horas_estimadas=None):
        """Converte um comentário vinculado a um ciclo em Tarefa técnica de forma atômica."""
        if not comentario.ciclo:
            raise ValueError("Comentário deve estar vinculado a um ciclo.")

        if horas_estimadas is None:
            horas = Decimal("1.00")
        elif isinstance(horas_estimadas, Decimal):
            horas = horas_estimadas
        else:
            horas = Decimal(str(horas_estimadas))

        desc = descricao or comentario.texto

        with transaction.atomic():
            tarefa = Tarefa.objects.create(
                ciclo=comentario.ciclo,
                descricao=desc,
                horas_estimadas=horas,
                status=StatusTarefa.PREVISTA,
                operador=operador,
            )
            comentario.tarefa_convertida = tarefa
            comentario.save(update_fields=["tarefa_convertida", "atualizado_em"])

        return tarefa
