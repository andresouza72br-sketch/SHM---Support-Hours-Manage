import logging
import secrets
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.clientes.models import (
    Cliente,
    StatusCliente,
    ClienteAceiteLink,
    ClienteAuditLog,
    TipoEventoClienteAudit,
)
from apps.accounts.models import User, UserRole, PasswordlessLoginToken
from apps.clientes.email_service import ClienteUsuarioEmailService
from apps.notificacoes.models import Notification

logger = logging.getLogger(__name__)

class ClienteService:
    @staticmethod
    @transaction.atomic
    def formalizar_aceite(token: str, ip: str = None, user_agent: str = None) -> tuple[Cliente | None, ClienteAceiteLink | None, int, str]:
        """
        Formaliza a aprovação cadastral e verificação de e-mail de um cliente via Magic Link.
        Garante atomicidade transacional na mutação do link, ativação do cliente e criação de notificações.
        
        Retorna:
            (cliente, link, status_http, mensagem)
            - 200: Aceite formalizado com sucesso
            - 404: Link não encontrado ou inválido
            - 409: Link já utilizado previamente
            - 410: Link expirado (prazo de 7 dias)
        """
        link = ClienteAceiteLink.objects.select_related("cliente").filter(token=token).first()
        if not link:
            return None, None, 404, "Link de aprovação não encontrado ou inválido."

        if link.usado:
            data_formatada = link.usado_em.strftime("%d/%m/%Y às %H:%M") if link.usado_em else "data anterior"
            return None, link, 409, f"Este cadastro já teve sua aprovação e validação formalizadas em {data_formatada}."

        if timezone.now() > link.data_expiracao:
            data_expira = link.data_expiracao.strftime("%d/%m/%Y às %H:%M")
            return None, link, 410, f"O prazo de 7 dias para aprovação deste cadastro expirou em {data_expira}."

        agora = timezone.now()

        # 1. Marcar link como usado
        link.usado = True
        link.usado_em = agora
        link.usado_ip = ip
        link.usado_user_agent = user_agent
        link.save(update_fields=["usado", "usado_em", "usado_ip", "usado_user_agent", "atualizado_em"])

        # 2. Atualizar cliente: status ATIVO, data de aprovação e validação de e-mail
        cliente = link.cliente
        cliente.status = StatusCliente.ATIVO
        cliente.aprovado_em = agora
        cliente.aprovado_por_nome = cliente.pessoa_contato or (cliente.nome_completo if cliente.tipo == "PF" else "Gestor Responsável")
        cliente.aprovado_por_email = cliente.email_contato
        cliente.aprovado_ip = ip
        cliente.aprovado_user_agent = user_agent
        cliente.email_verificado = True
        cliente.email_verificado_em = agora
        cliente.save(update_fields=[
            "status",
            "aprovado_em",
            "aprovado_por_nome",
            "aprovado_por_email",
            "aprovado_ip",
            "aprovado_user_agent",
            "email_verificado",
            "email_verificado_em",
            "atualizado_em",
        ])

        # 3. Notificações oficiais via governança configurada
        try:
            from apps.notificacoes.config_service import NotificacaoConfigService
            from apps.notificacoes.services import NotificacaoService
            enviar_email, enviar_in_app, dest_users, emails_cc = NotificacaoConfigService.resolver_destinatarios_evento(
                codigo="CLIENTE_CADASTRO_CONFIRMADO",
                cliente=cliente,
            )

            titulo_notif = f"Cadastro Aprovado: {cliente.display_name}"
            msg_notif = (
                f"O gestor responsável formalizou a aprovação do cadastro de '{cliente.display_name}' via Magic Link.\n\n"
                f"• E-mail validado: {cliente.email_contato}\n"
                f"• Status: Ativo e liberado para contratação e abertura de chamados."
            )

            if enviar_in_app and dest_users:
                notifs = [
                    Notification(
                        usuario=u,
                        titulo=titulo_notif,
                        mensagem=msg_notif,
                        url="/clientes",
                        lida=False,
                    )
                    for u in dest_users
                ]
                if notifs:
                    Notification.objects.bulk_create(notifs)

            if enviar_email and (dest_users or emails_cc):
                NotificacaoService._enviar_email(
                    destinatarios=list(dest_users),
                    assunto=titulo_notif,
                    mensagem_texto=msg_notif,
                    url_destino="/clientes",
                    cta_texto="Visualizar Cliente no SHM",
                    cc=emails_cc,
                )
        except Exception as notif_err:
            logger.warning("Falha ao processar notificações de formalização de cadastro de %s: %s", cliente.display_name, notif_err)

        return cliente, link, 200, f"Cadastro de '{cliente.display_name}' aprovado com sucesso! O e-mail '{cliente.email_contato}' foi validado automaticamente e a conta está ativa."

    @staticmethod
    @transaction.atomic
    def excluir_cliente(
        cliente: Cliente,
        justificativa: str,
        usuario: User = None,
        ip: str = None,
        user_agent: str = None,
    ) -> tuple[str, str]:
        """
        Executa a exclusão auditada de cliente com verificação de integridade referencial,
        registro indelével de auditoria forense e notificações para administradores.
        
        Retorna:
            (nome_cliente, justificativa_limpa)
        Lança ValidationError em caso de violação de regras de integridade ou justificativa inválida.
        """
        # 1. Regra Fundamental: Cliente não pode ter contratos no sistema
        total_contratos = cliente.contratos.count() if hasattr(cliente, "contratos") else 0
        if total_contratos > 0:
            raise ValidationError({
                "detail": f"Não é possível excluir o cliente '{cliente.display_name}' pois ele possui {total_contratos} contrato(s) no sistema. Clientes com contratos vinculados não podem ser excluídos para preservação da integridade jurídica e histórico contábil."
            })

        # 2. Verificar pedidos vinculados (se houver)
        total_pedidos = cliente.pedidos.count() if hasattr(cliente, "pedidos") else 0
        if total_pedidos > 0:
            raise ValidationError({
                "detail": f"Não é possível excluir o cliente '{cliente.display_name}' pois ele possui {total_pedidos} pedido(s) vinculado(s) no sistema."
            })

        # 3. Justificativa obrigatória (mínimo 10 caracteres para operações críticas N1)
        justificativa_limpa = (justificativa or "").strip()
        if not justificativa_limpa or len(justificativa_limpa) < 10:
            raise ValidationError({
                "justificativa": "A justificativa de exclusão é obrigatória e deve conter no mínimo 10 caracteres."
            })

        # 4. Captura de Auditoria Forense
        nome_cliente = cliente.display_name
        doc_cliente = cliente.cnpj if cliente.tipo == "PJ" else (cliente.cpf or "")
        cliente_id = cliente.id
        usuario_nome = (usuario.get_full_name() or usuario.username) if usuario else "Sistema"
        usuario_email = usuario.email if usuario else None
        usuario_role = usuario.get_role_display() if (usuario and hasattr(usuario, "get_role_display")) else str(getattr(usuario, "role", ""))

        ClienteAuditLog.objects.create(
            cliente_id=cliente_id,
            cliente_nome=nome_cliente,
            cliente_documento=doc_cliente,
            tipo_evento=TipoEventoClienteAudit.EXCLUSAO,
            descricao=f"Cliente '{nome_cliente}' ({doc_cliente or 'Sem documento'}) excluído definitivamente por {usuario_nome} ({usuario_role}).",
            justificativa=justificativa_limpa,
            usuario=usuario if (usuario and hasattr(usuario, "is_authenticated") and usuario.is_authenticated) else None,
            usuario_nome=usuario_nome,
            usuario_email=usuario_email,
            usuario_role=usuario_role,
            ip_origem=ip,
            user_agent=user_agent,
        )

        # Enlace criptográfico pericial SHA-256 na partição pericial do cliente
        try:
            from apps.contratos.forensic_service import ForensicAuditService, NivelRelevanciaAudit
            ForensicAuditService.registrar_evento(
                tipo_evento="CLIENTE_EXCLUSAO",
                descricao=f"Cliente '{nome_cliente}' ({doc_cliente or 'Sem documento'}) excluído definitivamente por {usuario_nome} ({usuario_role}).",
                nivel_relevancia=NivelRelevanciaAudit.N1,
                particao=f"cliente:{cliente_id}",
                usuario=usuario,
                usuario_nome=usuario_nome,
                usuario_email=usuario_email,
                usuario_role=usuario_role,
                justificativa=justificativa_limpa,
                dados_payload={
                    "cliente_id": cliente_id,
                    "nome_cliente": nome_cliente,
                    "documento": doc_cliente,
                    "tipo": cliente.tipo,
                    "email": cliente.email_contato,
                    "operador": usuario_nome,
                    "motivo": justificativa_limpa,
                },
                ip_origem=ip,
                user_agent=user_agent,
            )
        except Exception as forensic_err:
            logger.error("Falha ao registrar auditoria forense criptográfica na exclusão de cliente: %s", forensic_err, exc_info=True)
            raise

        # 5. Notificar Administradores da Empresa
        admin_filter = User.objects.filter(role=UserRole.EMPRESA_ADMIN, is_active=True)
        if usuario and getattr(usuario, "id", None):
            admin_filter = admin_filter.exclude(id=usuario.id)

        notifs = [
            Notification(
                usuario=admin_u,
                titulo=f"Cliente Excluído: {nome_cliente}",
                mensagem=f"O cliente '{nome_cliente}' foi excluído por {usuario_nome}. Justificativa: \"{justificativa_limpa}\"",
                url="/clientes",
                lida=False,
            )
            for admin_u in admin_filter
        ]
        if notifs:
            Notification.objects.bulk_create(notifs)

        # 6. Excluir o registro do cliente
        cliente.delete()

        return nome_cliente, justificativa_limpa

    @staticmethod
    def reenviar_aprovacao_cliente(cliente: Cliente, request=None) -> tuple[ClienteAceiteLink, bool]:
        """
        Reenvia o link de aprovação e validação cadastral por e-mail (validade 7 dias).
        Reutiliza link ativo não expirado ou cria novo.
        """
        aceite_link = cliente.aceite_links.filter(usado=False, data_expiracao__gt=timezone.now()).order_by("-criado_em").first()
        if not aceite_link:
            aceite_link = ClienteAceiteLink.objects.create(
                cliente=cliente,
                data_expiracao=timezone.now() + timedelta(days=7),
            )

        email_enviado = ClienteUsuarioEmailService.enviar_email_aprovacao_cliente(
            cliente=cliente,
            aceite_link=aceite_link,
            request=request,
        )
        return aceite_link, email_enviado

    @staticmethod
    @transaction.atomic
    def criar_colaborador_com_convite(
        cliente: Cliente,
        dados: dict,
        convidador: User = None,
    ) -> tuple[User, PasswordlessLoginToken, bool]:
        """
        Provisiona colaborador vinculado ao cliente, gera login único, senha temporária,
        emite token sem senha de 48h e dispara e-mail de boas-vindas.
        """
        email = dados["email"]
        first_name = dados["first_name"]
        last_name = dados.get("last_name", "")
        role = dados.get("role", UserRole.CLIENTE_ANALISTA)
        telefone = dados.get("telefone", "")

        # Normalização e geração de username único
        username_base = email.split("@")[0].lower().replace(".", "_").replace("-", "_")
        username = username_base
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{username_base}_{counter}"
            counter += 1

        senha_temp = secrets.token_urlsafe(12)
        novo_user = User.objects.create(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=role,
            telefone=telefone,
            cliente=cliente,
            is_active=True,
        )
        novo_user.set_password(senha_temp)
        novo_user.save()

        # Gera token de 48h para primeiro acesso sem senha
        expira_em = timezone.now() + timedelta(hours=48)
        token_obj = PasswordlessLoginToken.objects.create(
            user=novo_user,
            expira_em=expira_em,
            usado=False,
        )

        # Envia e-mail de convite
        email_enviado = ClienteUsuarioEmailService.enviar_convite_usuario(
            user=novo_user,
            token_obj=token_obj,
            convidador=convidador,
        )

        return novo_user, token_obj, email_enviado

    @staticmethod
    def reenviar_convite_usuario(target_user: User, convidador: User = None) -> tuple[PasswordlessLoginToken, bool]:
        """
        Gera novo token de primeiro acesso de 48 horas e dispara convite por e-mail.
        """
        expira_em = timezone.now() + timedelta(hours=48)
        token_obj = PasswordlessLoginToken.objects.create(
            user=target_user,
            expira_em=expira_em,
            usado=False,
        )

        email_enviado = ClienteUsuarioEmailService.enviar_convite_usuario(
            user=target_user,
            token_obj=token_obj,
            convidador=convidador,
        )

        return token_obj, email_enviado
