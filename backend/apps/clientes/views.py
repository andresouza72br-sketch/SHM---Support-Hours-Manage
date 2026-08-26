import secrets
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clientes.models import (
    Cliente,
    StatusCliente,
    ClienteAceiteLink,
    ClienteAuditLog,
    TipoEventoClienteAudit,
)
from apps.clientes.serializers import (
    ClienteSerializer,
    ClienteUserSerializer,
    ClienteUserCreateSerializer,
    ClienteUserUpdateSerializer,
    ClienteAprovacaoDetailSerializer,
)
from apps.accounts.models import User, UserRole, PasswordlessLoginToken
from apps.clientes.email_service import ClienteUsuarioEmailService
from apps.core.permissions import IsEmpresaAdmin, IsEmpresaUser, IsClienteGerente
from apps.core.utils import get_client_ip, get_client_user_agent
from apps.notificacoes.models import Notification

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.prefetch_related("contratos", "usuarios", "aceite_links").all()
    serializer_class = ClienteSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "excluir", "reenviar_aprovacao"):
            return [IsEmpresaAdmin()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        cliente = self.get_object()
        return self._executar_exclusao_cliente(request, cliente)

    @action(detail=True, methods=["delete", "post"], permission_classes=[IsEmpresaAdmin], url_path="excluir")
    def excluir(self, request, pk=None):
        cliente = self.get_object()
        return self._executar_exclusao_cliente(request, cliente)

    def _executar_exclusao_cliente(self, request, cliente):
        # 1. Regra Fundamental de Negócio: Cliente não pode ter contratos no sistema
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

        # 3. Justificativa obrigatória (mínimo 5 caracteres)
        justificativa = ""
        if isinstance(request.data, dict):
            justificativa = request.data.get("justificativa") or ""
        if not justificativa:
            justificativa = request.query_params.get("justificativa") or ""
        justificativa = justificativa.strip()

        if not justificativa or len(justificativa) < 5:
            raise ValidationError({
                "justificativa": "A justificativa de exclusão é obrigatória e deve conter no mínimo 5 caracteres."
            })

        # 4. Captura de Auditoria Forense
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        nome_cliente = cliente.display_name
        doc_cliente = cliente.cnpj if cliente.tipo == "PJ" else (cliente.cpf or "")
        cliente_id = cliente.id
        usuario_nome = request.user.get_full_name() or request.user.username
        usuario_role = request.user.get_role_display() if hasattr(request.user, "get_role_display") else str(request.user.role)

        # Grava registro permanente de auditoria forense
        ClienteAuditLog.objects.create(
            cliente_id=cliente_id,
            cliente_nome=nome_cliente,
            cliente_documento=doc_cliente,
            tipo_evento=TipoEventoClienteAudit.EXCLUSAO,
            descricao=f"Cliente '{nome_cliente}' ({doc_cliente or 'Sem documento'}) excluído definitivamente por {usuario_nome} ({usuario_role}).",
            justificativa=justificativa,
            usuario=request.user,
            usuario_nome=usuario_nome,
            usuario_email=request.user.email,
            usuario_role=usuario_role,
            ip_origem=ip,
            user_agent=ua,
        )

        # 5. Notificar Administradores da Empresa sobre a exclusão
        empresa_admins = User.objects.filter(
            role=UserRole.EMPRESA_ADMIN,
            is_active=True,
        ).exclude(id=request.user.id)
        
        notifs = [
            Notification(
                usuario=admin_u,
                titulo=f"Cliente Excluído: {nome_cliente}",
                mensagem=f"O cliente '{nome_cliente}' foi excluído por {usuario_nome}. Justificativa: \"{justificativa}\"",
                url="/clientes",
                lida=False,
            )
            for admin_u in empresa_admins
        ]
        if notifs:
            Notification.objects.bulk_create(notifs)

        # 6. Excluir o registro do cliente
        cliente.delete()

        return Response({
            "detail": f"Cliente '{nome_cliente}' excluído com sucesso e registrado na auditoria forense.",
            "cliente_nome": nome_cliente,
            "justificativa": justificativa,
        }, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        cliente = serializer.save()

        # Criação de link seguro de aprovação e validação com validade de 7 dias
        aceite_link = ClienteAceiteLink.objects.create(
            cliente=cliente,
            data_expiracao=timezone.now() + timedelta(days=7),
        )

        # Envio automático do Magic Link por e-mail para o gestor responsável
        ClienteUsuarioEmailService.enviar_email_aprovacao_cliente(
            cliente=cliente,
            aceite_link=aceite_link,
            request=self.request,
        )

        return cliente

    def get_queryset(self):
        user = self.request.user
        if user.is_empresa:
            return Cliente.objects.prefetch_related("contratos", "usuarios", "aceite_links").all()
        if user.cliente_id:
            return Cliente.objects.filter(id=user.cliente_id).prefetch_related("contratos", "usuarios", "aceite_links")
        return Cliente.objects.none()

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaAdmin], url_path="reenviar_aprovacao")
    def reenviar_aprovacao(self, request, pk=None):
        cliente = self.get_object()

        # Buscar link existente não expirado ou criar novo com 7 dias
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

        if not email_enviado:
            raise ValidationError({
                "detail": f"Não foi possível enviar o e-mail de aprovação para '{cliente.email_contato}'. Verifique o endereço digitado."
            })

        data_expira = aceite_link.data_expiracao.strftime("%d/%m/%Y às %H:%M")
        return Response({
            "detail": f"Magic link de aprovação e validação de e-mail (validade de 7 dias até {data_expira}) enviado com sucesso para '{cliente.email_contato}'!",
            "token": str(aceite_link.token),
            "expira_em": aceite_link.data_expiracao.isoformat(),
            "email_enviado": email_enviado,
        })


    def _check_cliente_gerente_access(self, request, cliente: Cliente):
        """Verifica se o usuário é Administrador da Empresa ou Gerente do próprio cliente."""
        if request.user.is_empresa or request.user.is_superuser:
            return True
        if request.user.role == UserRole.CLIENTE_GERENTE and request.user.cliente_id == cliente.id:
            return True
        raise PermissionDenied("Apenas administradores ou o gerente da própria empresa possuem acesso a esta ação.")

    @action(detail=True, methods=["post", "patch"], parser_classes=[MultiPartParser, FormParser, JSONParser], url_path="atualizar_perfil")
    def atualizar_perfil(self, request, pk=None):
        cliente = self.get_object()
        self._check_cliente_gerente_access(request, cliente)

        # Atualização de campos de contato e perfil
        campos_texto = [
            "nome_fantasia", "email_contato", "telefone", "celular_whatsapp",
            "pessoa_contato", "cargo_contato", "site_url", "cep", "logradouro",
            "numero", "complemento", "bairro", "cidade", "estado", "cor_primaria_hex"
        ]
        for campo in campos_texto:
            if campo in request.data:
                setattr(cliente, campo, request.data.get(campo))

        if "emails_notificacao_padrao" in request.data:
            emails = request.data.get("emails_notificacao_padrao")
            if isinstance(emails, list):
                cliente.emails_notificacao_padrao = emails

        # Upload de logo
        if "logo" in request.FILES:
            logo_file = request.FILES["logo"]
            if logo_file.size > 5 * 1024 * 1024:
                raise ValidationError({"logo": "A imagem da logo não pode exceder 5MB."})
            cliente.logo = logo_file

        cliente.save()
        serializer = self.get_serializer(cliente)
        return Response({
            "detail": "Informações da empresa atualizadas com sucesso!",
            "cliente": serializer.data,
        })

    # =========================================================================
    # GESTÃO DE USUÁRIOS VINCULADOS AO CLIENTE (RBAC / CONVITES)
    # =========================================================================
    @action(detail=True, methods=["get", "post"], url_path="usuarios")
    def usuarios(self, request, pk=None):
        cliente = self.get_object()

        # GET: Listar usuários do cliente
        if request.method == "GET":
            # Usuários do mesmo cliente ou equipe da empresa
            if not (request.user.is_empresa or request.user.cliente_id == cliente.id):
                raise PermissionDenied("Você não tem permissão para visualizar os usuários deste cliente.")
            
            usuarios_qs = User.objects.filter(cliente=cliente).order_by("-is_active", "first_name", "username")
            serializer = ClienteUserSerializer(usuarios_qs, many=True)
            return Response(serializer.data)

        # POST: Cadastrar novo colaborador do cliente e disparar convite
        self._check_cliente_gerente_access(request, cliente)
        create_serializer = ClienteUserCreateSerializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)

        data = create_serializer.validated_data
        email = data["email"]
        first_name = data["first_name"]
        last_name = data.get("last_name", "")
        role = data.get("role", UserRole.CLIENTE_ANALISTA)
        telefone = data.get("telefone", "")

        # Anti-privilege escalation
        if not request.user.is_empresa and role not in (UserRole.CLIENTE_GERENTE, UserRole.CLIENTE_ANALISTA):
            raise PermissionDenied("Você só pode criar usuários com perfil de Gerente ou Analista.")

        # Criação do User
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

        # Envia e-mail de boas-vindas com Magic Link
        email_enviado = ClienteUsuarioEmailService.enviar_convite_usuario(
            user=novo_user,
            token_obj=token_obj,
            convidador=request.user,
        )

        user_serializer = ClienteUserSerializer(novo_user)
        return Response({
            "detail": f"Usuário '{novo_user.email}' cadastrado com sucesso! Convite de acesso disparado por e-mail.",
            "user": user_serializer.data,
            "token": str(token_obj.token) if settings.DEBUG else None,
            "email_enviado": email_enviado,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"usuarios/(?P<user_id>[^/.]+)")
    def usuario_detail(self, request, pk=None, user_id=None):
        cliente = self.get_object()
        self._check_cliente_gerente_access(request, cliente)

        target_user = User.objects.filter(id=user_id, cliente=cliente).first()
        if not target_user:
            raise ValidationError({"detail": "Usuário não encontrado neste cliente."})

        if request.method == "DELETE":
            if target_user.id == request.user.id:
                raise ValidationError({"detail": "Você não pode desativar ou remover sua própria conta."})
            target_user.is_active = False
            target_user.save(update_fields=["is_active"])
            return Response({"detail": f"Acesso do usuário '{target_user.email}' desativado com sucesso."})

        # PATCH: Atualizar dados e perfil do usuário
        update_serializer = ClienteUserUpdateSerializer(target_user, data=request.data, partial=True)
        update_serializer.is_valid(raise_exception=True)

        new_role = update_serializer.validated_data.get("role")
        if new_role and not request.user.is_empresa and new_role not in (UserRole.CLIENTE_GERENTE, UserRole.CLIENTE_ANALISTA):
            raise PermissionDenied("Você não pode atribuir papéis de administração da empresa contratada.")

        new_is_active = update_serializer.validated_data.get("is_active")
        if new_is_active is False and target_user.id == request.user.id:
            raise ValidationError({"is_active": "Você não pode desativar o seu próprio usuário."})

        usuario_salvo = update_serializer.save()
        return Response({
            "detail": f"Usuário '{usuario_salvo.email}' atualizado com sucesso!",
            "user": ClienteUserSerializer(usuario_salvo).data,
        })

    @action(detail=True, methods=["post"], url_path=r"usuarios/(?P<user_id>[^/.]+)/reenviar_convite")
    def reenviar_convite(self, request, pk=None, user_id=None):
        cliente = self.get_object()
        self._check_cliente_gerente_access(request, cliente)

        target_user = User.objects.filter(id=user_id, cliente=cliente).first()
        if not target_user:
            raise ValidationError({"detail": "Usuário não encontrado neste cliente."})

        # Cria novo token de 48h
        expira_em = timezone.now() + timedelta(hours=48)
        token_obj = PasswordlessLoginToken.objects.create(
            user=target_user,
            expira_em=expira_em,
            usado=False,
        )

        email_enviado = ClienteUsuarioEmailService.enviar_convite_usuario(
            user=target_user,
            token_obj=token_obj,
            convidador=request.user,
        )

        return Response({
            "detail": f"Novo link de acesso de 48 horas reenviado para '{target_user.email}'!",
            "token": str(token_obj.token) if settings.DEBUG else None,
            "email_enviado": email_enviado,
        })

    @action(detail=True, methods=["post"], url_path=r"usuarios/(?P<user_id>[^/.]+)/alternar_status")
    def alternar_status(self, request, pk=None, user_id=None):
        cliente = self.get_object()
        self._check_cliente_gerente_access(request, cliente)

        target_user = User.objects.filter(id=user_id, cliente=cliente).first()
        if not target_user:
            raise ValidationError({"detail": "Usuário não encontrado neste cliente."})

        if target_user.id == request.user.id:
            raise ValidationError({"detail": "Você não pode alternar o status do seu próprio usuário."})

        target_user.is_active = not target_user.is_active
        target_user.save(update_fields=["is_active"])

        status_str = "ativado" if target_user.is_active else "bloqueado / desativado"
        return Response({
            "detail": f"Usuário '{target_user.email}' {status_str} com sucesso!",
            "is_active": target_user.is_active,
            "user": ClienteUserSerializer(target_user).data,
        })


class AceiteClienteView(APIView):
    """
    Endpoint público para consulta, revisão e formalização de aprovação de cadastro
    e verificação automática de e-mail do gestor com Magic Link (validade de 7 dias).
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        link = ClienteAceiteLink.objects.select_related("cliente").filter(token=token).first()
        if not link:
            return Response(
                {"detail": "Link de aprovação não encontrado ou inválido."},
                status=status.HTTP_404_NOT_FOUND,
            )

        cliente = link.cliente
        expirado = timezone.now() > link.data_expiracao
        serializer = ClienteAprovacaoDetailSerializer(cliente, context={"request": request})

        return Response({
            "cliente": serializer.data,
            "expirado": expirado,
            "expira_em": link.data_expiracao.isoformat(),
            "usado": link.usado,
            "usado_em": link.usado_em.isoformat() if link.usado_em else None,
            "email_verificado": cliente.email_verificado,
        })

    def post(self, request, token):
        from apps.core.utils import get_client_ip, get_client_user_agent
        from apps.notificacoes.models import Notification
        from apps.accounts.models import User, UserRole

        link = ClienteAceiteLink.objects.select_related("cliente").filter(token=token).first()
        if not link:
            return Response(
                {"detail": "Link de aprovação não encontrado ou inválido."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if link.usado:
            data_formatada = link.usado_em.strftime("%d/%m/%Y às %H:%M") if link.usado_em else "data anterior"
            return Response(
                {"detail": f"Este cadastro já teve sua aprovação e validação formalizadas em {data_formatada}."},
                status=status.HTTP_409_CONFLICT,
            )

        if timezone.now() > link.data_expiracao:
            data_expira = link.data_expiracao.strftime("%d/%m/%Y às %H:%M")
            return Response(
                {"detail": f"O prazo de 7 dias para aprovação deste cadastro expirou em {data_expira}."},
                status=status.HTTP_410_GONE,
            )

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        agora = timezone.now()

        # Marcar link como usado
        link.usado = True
        link.usado_em = agora
        link.usado_ip = ip
        link.usado_user_agent = ua
        link.save(update_fields=["usado", "usado_em", "usado_ip", "usado_user_agent", "atualizado_em"])

        # Atualizar cliente: status ATIVO, aprovado_em e email_verificado em uma única ação
        cliente = link.cliente
        cliente.status = StatusCliente.ATIVO
        cliente.aprovado_em = agora
        cliente.aprovado_por_nome = cliente.pessoa_contato or (cliente.nome_completo if cliente.tipo == "PF" else "Gestor Responsável")
        cliente.aprovado_por_email = cliente.email_contato
        cliente.aprovado_ip = ip
        cliente.aprovado_user_agent = ua
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

        # Notificações internas para a equipe da empresa
        empresa_users = User.objects.filter(
            role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO],
            is_active=True,
        )
        notifs = [
            Notification(
                usuario=u,
                titulo=f"Cadastro Aprovado: {cliente.display_name}",
                mensagem=f"O gestor responsável formalizou a aprovação do cadastro de '{cliente.display_name}' via Magic Link. E-mail '{cliente.email_contato}' verificado com sucesso.",
                url="/clientes",
                lida=False,
            )
            for u in empresa_users
        ]
        if notifs:
            Notification.objects.bulk_create(notifs)

        serializer = ClienteAprovacaoDetailSerializer(cliente, context={"request": request})
        return Response({
            "detail": f"Cadastro de '{cliente.display_name}' aprovado com sucesso! O e-mail '{cliente.email_contato}' foi validado automaticamente e a conta está ativa.",
            "cliente": serializer.data,
            "data_aprovacao": cliente.aprovado_em.isoformat(),
            "email_verificado": True,
            "ip_origem": ip,
        })