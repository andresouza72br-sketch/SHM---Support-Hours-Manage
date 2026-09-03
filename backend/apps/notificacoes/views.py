from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.notificacoes.models import Notification, TimelineEvent
from apps.notificacoes.serializers import NotificationSerializer, TimelineEventSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(usuario=self.request.user)

    @action(detail=True, methods=["post"])
    def marcar_lida(self, request, pk=None):
        notif = self.get_object()
        notif.lida = True
        notif.save(update_fields=["lida", "atualizado_em"])
        return Response({"status": "lida"})

    @action(detail=False, methods=["post"])
    def marcar_todas_lidas(self, request):
        Notification.objects.filter(usuario=request.user, lida=False).update(lida=True)
        return Response({"status": "todas_lidas"})

class TimelineViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TimelineEventSerializer
    queryset = TimelineEvent.objects.select_related("autor", "pedido", "ciclo").all()

    def get_queryset(self):
        qs = super().get_queryset()
        pedido_id = self.request.query_params.get("pedido")
        if pedido_id:
            qs = qs.filter(pedido_id=pedido_id)
        return qs


class ConfiguracaoNotificacaoViewSet(viewsets.ModelViewSet):
    """
    CRUD administrativo de regras e políticas de disparo de e-mails e notificações in-app.
    Acesso restrito à equipe gestora da Empresa (Administradores).
    """
    from apps.notificacoes.serializers import ConfiguracaoNotificacaoSerializer
    serializer_class = ConfiguracaoNotificacaoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from apps.notificacoes.models import ConfiguracaoNotificacao
        from apps.notificacoes.config_service import NotificacaoConfigService
        if not ConfiguracaoNotificacao.objects.exists():
            NotificacaoConfigService.garantir_configuracoes_padrao()
        return ConfiguracaoNotificacao.objects.all().order_by("categoria", "codigo")

    def check_permissions(self, request):
        super().check_permissions(request)
        if not getattr(request.user, "is_empresa", False) and not request.user.is_staff:
            self.permission_denied(
                request,
                message="Acesso restrito aos administradores da plataforma SHM.",
                code=status.HTTP_403_FORBIDDEN,
            )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.bloqueado_edicao and request.data.get("ativo_email") is False:
            return Response(
                {"detail": "Este evento é essencial para o funcionamento do sistema e o envio de e-mail não pode ser desativado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.bloqueado_edicao and request.data.get("ativo_email") is False:
            return Response(
                {"detail": "Este evento é essencial para o funcionamento do sistema e o envio de e-mail não pode ser desativado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=["post"], url_path="resetar-padroes")
    def resetar_padroes(self, request):
        """
        Restaura todos os eventos de notificação para os valores padrão de fábrica.
        """
        from apps.notificacoes.models import ConfiguracaoNotificacao
        from apps.notificacoes.config_service import CONFIGURACOES_PADRAO
        for item in CONFIGURACOES_PADRAO:
            ConfiguracaoNotificacao.objects.update_or_create(
                codigo=item["codigo"],
                defaults=item,
            )
        return Response({"status": "padroes_restaurados", "total": len(CONFIGURACOES_PADRAO)})

    @action(detail=True, methods=["post"], url_path="testar-disparo")
    def testar_disparo(self, request, pk=None):
        """
        Dispara um e-mail transacional de homologação para o e-mail do próprio administrador solicitante.
        """
        cfg = self.get_object()
        email_admin = request.user.email
        if not email_admin or "@" not in email_admin:
            return Response(
                {"detail": "Seu usuário não possui um endereço de e-mail válido para receber o teste."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.notificacoes.services import NotificacaoService
        assunto_teste = f"[TESTE] {cfg.nome}"
        corpo_teste = (
            f"Olá, {request.user.first_name or request.user.username}!\n\n"
            f"Este é um e-mail de homologação disparado pelo painel administrativo do SHM.\n\n"
            f"• Evento: {cfg.nome} ({cfg.codigo})\n"
            f"• Categoria: {cfg.get_categoria_display()}\n"
            f"• Status de Envio por E-mail: {'ATIVADO' if cfg.ativo_email else 'DESATIVADO'}\n"
            f"• Status de Notificação In-App: {'ATIVADO' if cfg.ativo_in_app else 'DESATIVADO'}\n"
            f"• Descrição da Regra: {cfg.descricao}\n\n"
            f"Se você recebeu esta mensagem, o servidor SMTP e o canal de e-mail deste evento estão funcionando perfeitamente."
        )

        try:
            NotificacaoService._enviar_email(
                destinatarios=[email_admin],
                assunto=assunto_teste,
                mensagem_texto=corpo_teste,
                url_destino="/admin/configuracoes/notificacoes",
                cta_texto="Acessar Configurações no SHM",
            )

            # Se a notificação in-app também estiver ativa para o evento, gera alerta no sininho do admin
            notif_in_app_gerada = False
            if cfg.ativo_in_app:
                from apps.notificacoes.models import Notification
                Notification.objects.create(
                    usuario=request.user,
                    titulo=f"[TESTE] {cfg.nome}",
                    mensagem=f"Homologação do canal in-app para o evento {cfg.nome} ({cfg.codigo}).",
                    url="/admin/configuracoes/notificacoes",
                )
                notif_in_app_gerada = True

            msg_retorno = f"E-mail de teste disparado com sucesso para {email_admin}."
            if notif_in_app_gerada:
                msg_retorno += " Notificação in-app também enviada para o seu sininho."

            return Response({
                "status": "sucesso",
                "mensagem": msg_retorno,
                "destinatario": email_admin,
                "in_app": notif_in_app_gerada,
            })
        except Exception as err:
            return Response(
                {"detail": f"Falha ao enviar e-mail de teste: {err}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )