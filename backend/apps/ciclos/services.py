from datetime import timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from apps.ciclos.models import Ciclo, StatusCiclo, CicloMagicLink, TipoAcaoMagicLink
from apps.pedidos.services import PedidoService

class CicloService:
    @staticmethod
    def gerar_magic_link(ciclo: Ciclo, tipo_acao: str) -> CicloMagicLink:
        """
        Gera um token UUIDv4 criptográfico/seguro de uso único com expiração de 7 dias.
        """
        expira_em = timezone.now() + timedelta(days=7)
        magic_link = CicloMagicLink.objects.create(
            ciclo=ciclo,
            tipo_acao=tipo_acao,
            expira_em=expira_em,
            usado=False,
        )
        ciclo.token_acesso = magic_link.token
        ciclo.save(update_fields=["token_acesso", "atualizado_em"])
        return magic_link

    @staticmethod
    @transaction.atomic
    def criar_ciclo(pedido_id, tipo, contexto, operador, horas_estimadas=0) -> Ciclo:
        from apps.pedidos.models import Pedido
        pedido = Pedido.objects.get(id=pedido_id)
        ciclo = Ciclo.objects.create(
            pedido=pedido,
            tipo=tipo,
            contexto=contexto,
            operador=operador,
            horas_estimadas=Decimal(str(horas_estimadas)),
            status=StatusCiclo.ORCADO,
        )
        PedidoService.sincronizar_status_pedido(pedido)
        return ciclo

    @staticmethod
    @transaction.atomic
    def apresentar_orcamento(ciclo: Ciclo, horas_estimadas: Decimal, usuario=None) -> Ciclo:
        if horas_estimadas <= 0:
            raise ValidationError("Horas estimadas deve ser maior que zero.")
        ciclo.horas_estimadas = horas_estimadas
        ciclo.status = StatusCiclo.AGUARDANDO_APROVACAO
        ciclo.apresentado_em = timezone.now()
        ciclo.save(update_fields=["horas_estimadas", "status", "apresentado_em", "atualizado_em"])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)

        # Gera token de aprovação de orçamento válido por 7 dias
        magic_link = CicloService.gerar_magic_link(ciclo, TipoAcaoMagicLink.APROVACAO_ORCAMENTO)

        try:
            from apps.notificacoes.services import NotificacaoService
            autor = usuario or ciclo.operador
            NotificacaoService.notificar_evento_ciclo(
                ciclo,
                "orcamento_apresentado",
                usuario_autor=autor,
                token_magic_link=magic_link,
            )
        except Exception:
            pass
        return ciclo

    @staticmethod
    @transaction.atomic
    def aprovar_orcamento(
        ciclo: Ciclo,
        usuario=None,
        ip_origem: str = None,
        user_agent: str = None,
        metodo: str = "APP",
    ) -> Ciclo:
        ciclo.status = StatusCiclo.APROVADO
        ciclo.aprovado_em = timezone.now()
        ciclo.aprovado_por = usuario if (hasattr(usuario, "is_authenticated") and usuario.is_authenticated) else None
        ciclo.aprovado_ip = ip_origem
        ciclo.aprovado_user_agent = user_agent
        ciclo.aprovado_metodo = metodo
        ciclo.save(update_fields=[
            "status",
            "aprovado_em",
            "aprovado_por",
            "aprovado_ip",
            "aprovado_user_agent",
            "aprovado_metodo",
            "atualizado_em",
        ])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        try:
            from apps.notificacoes.services import NotificacaoService
            NotificacaoService.notificar_evento_ciclo(
                ciclo,
                "orcamento_aprovado",
                usuario_autor=ciclo.aprovado_por,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
        except Exception:
            pass
        return ciclo

    @staticmethod
    @transaction.atomic
    def rejeitar_orcamento(ciclo: Ciclo, justificativa: str, usuario=None, ip_origem: str = None, user_agent: str = None) -> Ciclo:
        if not justificativa.strip():
            raise ValidationError("Justificativa é obrigatória para rejeitar orçamento.")
        ciclo.status = StatusCiclo.ORCADO
        ciclo.apresentado_em = None
        ciclo.save(update_fields=["status", "apresentado_em", "atualizado_em"])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        try:
            from apps.notificacoes.services import NotificacaoService
            autor = usuario if (hasattr(usuario, "is_authenticated") and usuario.is_authenticated) else None
            NotificacaoService.notificar_evento_ciclo(
                ciclo,
                "orcamento_rejeitado",
                usuario_autor=autor,
                justificativa=justificativa,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
        except Exception:
            pass
        return ciclo

    @staticmethod
    @transaction.atomic
    def iniciar_execucao(ciclo: Ciclo, usuario=None) -> Ciclo:
        ciclo.status = StatusCiclo.EM_EXECUCAO
        ciclo.save(update_fields=["status", "atualizado_em"])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        try:
            from apps.notificacoes.services import NotificacaoService
            autor = usuario or ciclo.operador
            NotificacaoService.notificar_evento_ciclo(ciclo, "execucao_iniciada", usuario_autor=autor)
        except Exception:
            pass
        return ciclo

    @staticmethod
    @transaction.atomic
    def solicitar_aceite(ciclo: Ciclo, usuario=None) -> Ciclo:
        ciclo.status = StatusCiclo.AGUARDANDO_ACEITE
        ciclo.save(update_fields=["status", "atualizado_em"])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)

        # Gera token de aceite final de ciclo válido por 7 dias
        magic_link = CicloService.gerar_magic_link(ciclo, TipoAcaoMagicLink.ACEITE_CICLO)

        try:
            from apps.notificacoes.services import NotificacaoService
            autor = usuario or ciclo.operador
            NotificacaoService.notificar_evento_ciclo(
                ciclo,
                "aceite_solicitado",
                usuario_autor=autor,
                token_magic_link=magic_link,
            )
        except Exception:
            pass
        return ciclo

    @staticmethod
    @transaction.atomic
    def aceitar_ciclo(
        ciclo: Ciclo,
        usuario=None,
        ip_origem: str = None,
        user_agent: str = None,
        metodo: str = "APP",
    ) -> Ciclo:
        ciclo.status = StatusCiclo.ACEITO
        ciclo.aceito_em = timezone.now()
        ciclo.aceito_por = usuario if (hasattr(usuario, "is_authenticated") and usuario.is_authenticated) else None
        ciclo.aceito_ip = ip_origem
        ciclo.aceito_user_agent = user_agent
        ciclo.aceito_metodo = metodo
        ciclo.save(update_fields=[
            "status",
            "aceito_em",
            "aceito_por",
            "aceito_ip",
            "aceito_user_agent",
            "aceito_metodo",
            "atualizado_em",
        ])

        # Débito de saldo real no contrato com compliance forense
        from apps.saldo.services import SaldoService
        if ciclo.horas_realizadas > 0:
            SaldoService.consumir(
                contrato=ciclo.pedido.contrato,
                horas=ciclo.horas_realizadas,
                pedido=ciclo.pedido,
                ciclo=ciclo,
                autor=ciclo.aceito_por,
                ip_origem=ip_origem,
                user_agent=user_agent,
                metodo_aprovacao=metodo,
            )

        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        try:
            from apps.notificacoes.services import NotificacaoService
            NotificacaoService.notificar_evento_ciclo(
                ciclo,
                "ciclo_aceito",
                usuario_autor=ciclo.aceito_por,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
        except Exception:
            pass
        return ciclo

    @staticmethod
    @transaction.atomic
    def recusar_aceite(ciclo: Ciclo, justificativa: str, usuario=None, ip_origem: str = None, user_agent: str = None) -> Ciclo:
        if not justificativa.strip():
            raise ValidationError("Justificativa é obrigatória para recusar o aceite.")
        ciclo.status = StatusCiclo.EM_EXECUCAO
        ciclo.save(update_fields=["status", "atualizado_em"])
        PedidoService.sincronizar_status_pedido(ciclo.pedido)
        try:
            from apps.notificacoes.services import NotificacaoService
            autor = usuario if (hasattr(usuario, "is_authenticated") and usuario.is_authenticated) else None
            NotificacaoService.notificar_evento_ciclo(
                ciclo,
                "aceite_recusado",
                usuario_autor=autor,
                justificativa=justificativa,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
        except Exception:
            pass
        return ciclo