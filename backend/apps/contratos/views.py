import os
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.contratos.models import (
    Contrato,
    StatusContrato,
    ContratoDocumento,
    ContratoAuditLog,
    TipoEventoContratoAudit,
    TipoDocumentoContrato,
)
from apps.contratos.serializers import (
    ContratoSerializer,
    ContratoDocumentoSerializer,
    ContratoAuditLogSerializer,
)
from apps.contratos.services import ContratoService
from apps.core.permissions import IsEmpresaAdmin, IsEmpresaUser, IsClienteGerente
from apps.core.utils import get_client_ip, get_client_user_agent

def _is_gerente_do_contrato(user, contrato) -> bool:
    """
    Retorna True se o usuário autenticado é o gerente responsável cadastrado
    no contrato (role CLIENTE_GERENTE + email == gestor_email do contrato),
    pertencendo ao mesmo cliente vinculado.
    Superusuários e staff sempre passam.
    """
    if user.is_superuser or user.is_staff:
        return True
    return (
        user.role == "CLIENTE_GERENTE"
        and user.cliente_id == contrato.cliente_id
        and contrato.gestor_email
        and user.email.lower() == contrato.gestor_email.lower()
    )


class ContratoViewSet(viewsets.ModelViewSet):
    queryset = (
        Contrato.objects.select_related("cliente", "criado_por", "cancelado_por", "concluido_por")
        .prefetch_related("documentos", "pdfs", "auditoria")
        .all()
    )
    serializer_class = ContratoSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "cancelar", "concluir", "upload_documento", "deletar_documento"):
            return [IsEmpresaAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        contrato = ContratoService.criar_contrato(self.request.data, self.request.user, request=self.request)
        serializer.instance = contrato
        return contrato

    def perform_update(self, serializer):
        contrato_antigo = self.get_object()
        contrato = serializer.save()

        # Log audit of modifications
        ip = get_client_ip(self.request)
        ua = get_client_user_agent(self.request)
        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.ALTERACAO,
            descricao=f"Dados cadastrais do contrato {contrato.numero} alterados por {self.request.user.get_full_name() or self.request.user.username} ({self.request.user.get_role_display()}).",
            usuario=self.request.user,
            ip_origem=ip,
            user_agent=ua,
        )

    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            {"detail": "Contratos não podem ser excluídos do sistema. Utilize o cancelamento com justificativa obrigatória para manter o histórico auditável."}
        )

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_empresa:
            return qs
        if user.cliente_id:
            return qs.filter(cliente_id=user.cliente_id)
        return qs.none()

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaAdmin])
    def cancelar(self, request, pk=None):
        contrato = self.get_object()
        justificativa = (request.data.get("justificativa") or "").strip()

        if not justificativa or len(justificativa) < 5:
            raise ValidationError({"justificativa": "A justificativa de cancelamento é obrigatória e deve conter pelo menos 5 caracteres."})

        if contrato.status == StatusContrato.CANCELADO:
            return Response({"detail": "Este contrato já se encontra cancelado."}, status=status.HTTP_400_BAD_REQUEST)

        contrato.status = StatusContrato.CANCELADO
        contrato.justificativa_cancelamento = justificativa
        contrato.cancelado_por = request.user
        contrato.cancelado_em = timezone.now()
        contrato.save(update_fields=["status", "justificativa_cancelamento", "cancelado_por", "cancelado_em", "atualizado_em"])

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.CANCELAMENTO,
            descricao=f"Contrato {contrato.numero} cancelado por {request.user.get_full_name() or request.user.username}.",
            justificativa=justificativa,
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        serializer = self.get_serializer(contrato)
        return Response({
            "detail": f"Contrato {contrato.numero} cancelado com sucesso!",
            "contrato": serializer.data,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaAdmin])
    def concluir(self, request, pk=None):
        contrato = self.get_object()

        if contrato.status == StatusContrato.CONCLUIDO:
            return Response({"detail": "Este contrato já se encontra concluído."}, status=status.HTTP_400_BAD_REQUEST)

        contrato.status = StatusContrato.CONCLUIDO
        contrato.concluido_por = request.user
        contrato.concluido_em = timezone.now()
        contrato.save(update_fields=["status", "concluido_por", "concluido_em", "atualizado_em"])

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.CONCLUSAO,
            descricao=f"Contrato {contrato.numero} marcado como Concluído por {request.user.get_full_name() or request.user.username}.",
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        serializer = self.get_serializer(contrato)
        return Response({
            "detail": f"Contrato {contrato.numero} marcado como concluído com sucesso!",
            "contrato": serializer.data,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaAdmin], parser_classes=[MultiPartParser, FormParser])
    def upload_documento(self, request, pk=None):
        contrato = self.get_object()

        if contrato.documentos.count() >= 5:
            raise ValidationError({"detail": "Limite máximo de 5 documentos por contrato atingido. Remova um documento existente antes de adicionar outro."})

        arquivo = request.FILES.get("arquivo")
        if not arquivo:
            raise ValidationError({"arquivo": "Nenhum arquivo enviado."})

        # Validação de tamanho (máximo 25MB)
        if arquivo.size > 25 * 1024 * 1024:
            raise ValidationError({"arquivo": "O arquivo excede o limite máximo permitido de 25MB."})

        tipo_doc = request.data.get("tipo_documento", TipoDocumentoContrato.OUTRO)
        if tipo_doc not in TipoDocumentoContrato.values:
            tipo_doc = TipoDocumentoContrato.OUTRO

        nome_original = getattr(arquivo, "name", "documento")

        doc = ContratoDocumento.objects.create(
            contrato=contrato,
            arquivo=arquivo,
            nome_original=nome_original,
            tipo_documento=tipo_doc,
            tamanho_bytes=arquivo.size,
            enviado_por=request.user,
        )

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.UPLOAD_DOCUMENTO,
            descricao=f"Upload do documento '{nome_original}' ({doc.get_tipo_documento_display()}) realizado por {request.user.get_full_name() or request.user.username}.",
            documento_nome=nome_original,
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        serializer = ContratoDocumentoSerializer(doc, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], permission_classes=[IsEmpresaAdmin], url_path="documentos/(?P<doc_id>[^/.]+)")
    def deletar_documento(self, request, pk=None, doc_id=None):
        contrato = self.get_object()
        doc = ContratoDocumento.objects.filter(contrato=contrato, id=doc_id).first()
        if not doc:
            raise Http404("Documento não encontrado neste contrato.")

        nome = doc.nome_original
        tipo_disp = doc.get_tipo_documento_display()
        doc.delete()

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.EXCLUSAO_DOCUMENTO,
            descricao=f"Documento '{nome}' ({tipo_disp}) excluído por {request.user.get_full_name() or request.user.username}.",
            documento_nome=nome,
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        return Response({"detail": f"Documento '{nome}' excluído com sucesso."})

    @action(detail=True, methods=["get"], url_path="documentos/(?P<doc_id>[^/.]+)/download")
    def download_documento(self, request, pk=None, doc_id=None):
        contrato = self.get_object()

        # Empresa sempre pode; cliente só se for o gerente cadastrado no contrato
        if not request.user.is_empresa:
            if not _is_gerente_do_contrato(request.user, contrato):
                raise PermissionDenied(
                    "Somente o Gerente responsável cadastrado neste contrato pode baixar documentos."
                )

        doc = ContratoDocumento.objects.filter(contrato=contrato, id=doc_id).first()
        if not doc:
            raise Http404("Documento não encontrado.")

        # REGISTRO DE AUDITORIA FORENSE DE DOWNLOAD
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        usuario_str = request.user.get_full_name() or request.user.username
        role_str = request.user.get_role_display()

        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.DOWNLOAD_DOCUMENTO,
            descricao=f"Download do documento '{doc.nome_original}' ({doc.get_tipo_documento_display()}) efetuado por {usuario_str} ({role_str}).",
            documento_nome=doc.nome_original,
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        try:
            return FileResponse(doc.arquivo.open("rb"), as_attachment=True, filename=doc.nome_original)
        except Exception:
            return Response({"url": request.build_absolute_uri(doc.arquivo.url)})

    @action(detail=True, methods=["patch", "post"], url_path="atualizar_emails")
    def atualizar_emails(self, request, pk=None):
        contrato = self.get_object()

        # Permissão: Empresa Admin OU Gerente cadastrado no contrato (gestor_email)
        if not (request.user.is_empresa or _is_gerente_do_contrato(request.user, contrato)):
            raise PermissionDenied(
                "Apenas o Administrador da Empresa ou o Gerente responsável cadastrado neste contrato podem gerenciar e-mails de notificação."
            )

        emails = request.data.get("emails_notificacao")
        if emails is None:
            raise ValidationError({"emails_notificacao": "Campo obrigatório."})

        if not isinstance(emails, list):
            raise ValidationError({"emails_notificacao": "Deve ser uma lista de e-mails de notificação."})

        contrato.emails_notificacao = emails
        contrato.save(update_fields=["emails_notificacao", "atualizado_em"])

        # Sincronizar destinatários relacionais e disparar convites de 15 dias
        from apps.contratos.email_service import ContratoEmailNotificacaoService
        ContratoEmailNotificacaoService.sincronizar_destinatarios_contrato(
            contrato=contrato,
            lista_emails=emails,
            usuario_solicitante=request.user,
            request=request,
        )

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        usuario_str = request.user.get_full_name() or request.user.username
        role_str = request.user.get_role_display()
        total_ativos = sum(1 for e in emails if isinstance(e, dict) and e.get("ativo"))

        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.ATUALIZACAO_EMAILS,
            descricao=f"Lista de e-mails de notificação atualizada por {usuario_str} ({role_str}). Total cadastrado: {len(emails)} ({total_ativos} ativos).",
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        serializer = self.get_serializer(contrato)
        return Response({
            "detail": "Lista de e-mails de notificação atualizada com sucesso!",
            "emails_notificacao": contrato.emails_notificacao,
            "contrato": serializer.data,
        })

    @action(detail=True, methods=["post"], url_path="reenviar_convite_email")
    def reenviar_convite_email(self, request, pk=None):
        contrato = self.get_object()

        # Permissão: Empresa Admin OU Gerente cadastrado no contrato (gestor_email)
        if not (request.user.is_empresa or _is_gerente_do_contrato(request.user, contrato)):
            raise PermissionDenied("Sem permissão para reenviar convites de e-mail deste contrato.")

        email_alvo = request.data.get("email")
        destinatario_id = request.data.get("destinatario_id")

        dest = None
        if destinatario_id:
            dest = contrato.destinatarios_notificacao.filter(id=destinatario_id).first()
        elif email_alvo:
            dest = contrato.destinatarios_notificacao.filter(email__iexact=str(email_alvo).strip()).first()

        if not dest:
            raise ValidationError({"detail": "Destinatário de e-mail não encontrado neste contrato."})

        # Renovar token e validade de 15 dias
        import uuid
        dest.token = uuid.uuid4()
        dest.expira_em = timezone.now() + timedelta(days=15)
        dest.status = "pendente"
        dest.convidado_por = request.user
        dest.save()

        from apps.contratos.email_service import ContratoEmailNotificacaoService
        sucesso = ContratoEmailNotificacaoService.enviar_convite_confirmacao_email(dest, request)

        if not sucesso:
            return Response({"detail": "Falha ao enviar e-mail de confirmação. Verifique o endereço digitado."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = ContratoEmailNotificacaoSerializer(dest)
        return Response({
            "detail": f"Convite de confirmação com validade de 15 dias reenviado para '{dest.email}' com sucesso!",
            "destinatario": serializer.data,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsEmpresaAdmin], url_path="reenviar_aceite")
    def reenviar_aceite(self, request, pk=None):
        contrato = self.get_object()

        from apps.contratos.models import AceiteLink
        from datetime import timedelta

        # Obter link existente não expirado ou criar novo/renovar
        link = contrato.aceite_links.filter(usado=False, data_expiracao__gt=timezone.now()).order_by("-criado_em").first()
        if not link:
            link = AceiteLink.objects.create(
                contrato=contrato,
                data_expiracao=timezone.now() + timedelta(days=30),
            )

        from apps.contratos.email_service import ContratoEmailNotificacaoService
        sucesso = ContratoEmailNotificacaoService.enviar_email_aceite_contrato(contrato, link, request=request)

        if not sucesso:
            raise ValidationError({"detail": "Não foi possível enviar o e-mail de aceite. Verifique se o e-mail do gestor ou do cliente está devidamente preenchido."})

        return Response({
            "detail": f"E-mail de solicitação de aceite e início dos trabalhos reenviado com sucesso para o responsável pelo contrato {contrato.numero}!",
            "token": str(link.token),
            "expira_em": link.data_expiracao.isoformat(),
        })

    @action(detail=True, methods=["post"], url_path="auditar_relatorio")
    def auditar_relatorio(self, request, pk=None):
        contrato = self.get_object()

        # Empresa sempre pode; cliente só se for o gerente cadastrado no contrato
        if not request.user.is_empresa:
            if not _is_gerente_do_contrato(request.user, contrato):
                raise PermissionDenied(
                    "Somente o Gerente responsável cadastrado neste contrato pode emitir o relatório."
                )

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        usuario_str = request.user.get_full_name() or request.user.username
        role_str = request.user.get_role_display()

        log = ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.DOWNLOAD_RELATORIO,
            descricao=f"Download / Impressão do Relatório Oficial do Contrato {contrato.numero} efetuada por {usuario_str} ({role_str}).",
            documento_nome=f"Extrato-{contrato.numero}.pdf",
            usuario=request.user,
            ip_origem=ip,
            user_agent=ua,
        )

        return Response({
            "detail": f"Auditoria do download/impressão do relatório do contrato {contrato.numero} registrada com sucesso!",
            "log_id": log.id,
            "timestamp": log.timestamp.isoformat(),
        })

    @action(detail=True, methods=["get"])
    def auditoria(self, request, pk=None):
        contrato = self.get_object()
        logs = contrato.auditoria.select_related("usuario").order_by("-timestamp")
        serializer = ContratoAuditLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def extrato(self, request, pk=None):
        contrato = self.get_object()
        serializer = self.get_serializer(contrato)
        # Resumo de histórico de ciclos aceitos vinculados
        from apps.ciclos.models import Ciclo, StatusCiclo
        ciclos_aceitos = (
            Ciclo.objects.filter(pedido__contrato=contrato, status=StatusCiclo.ACEITO)
            .select_related("pedido")
            .order_by("-aceito_em")
        )

        ciclos_data = [
            {
                "id": c.id,
                "pedido_protocolo": c.pedido.protocolo,
                "tipo": c.get_tipo_display(),
                "contexto": c.contexto,
                "horas_realizadas": float(c.horas_realizadas),
                "aceito_em": c.aceito_em,
            }
            for c in ciclos_aceitos
        ]

        # Auditoria completa do contrato
        auditoria_completa = ContratoAuditLogSerializer(
            contrato.auditoria.select_related("usuario").order_by("-timestamp"),
            many=True,
        ).data

        return Response({
            "contrato": serializer.data,
            "historico_ciclos": ciclos_data,
            "auditoria": auditoria_completa,
        })

class AceiteContratoView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        from django.utils import timezone
        from apps.contratos.models import AceiteLink

        link = AceiteLink.objects.select_related("contrato__cliente", "contrato__criado_por").filter(token=token).first()
        if not link:
            return Response({"detail": "Token de aceite não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        contrato = link.contrato
        expirado = timezone.now() > link.data_expiracao
        serializer = ContratoSerializer(contrato, context={"request": request})

        cliente = contrato.cliente
        cliente_nome = cliente.display_name if cliente else "Cliente"
        cliente_cnpj_cpf = cliente.cnpj or cliente.cpf if cliente else ""

        return Response({
            "contrato": serializer.data,
            "cliente_nome": cliente_nome,
            "cliente_cnpj_cpf": cliente_cnpj_cpf,
            "expirado": expirado,
            "expira_em": link.data_expiracao.isoformat(),
            "usado": link.usado,
            "usado_em": link.usado_em.isoformat() if link.usado_em else None,
        })

    def post(self, request, token):
        from django.utils import timezone
        from apps.contratos.models import AceiteLink, StatusContrato, ContratoAuditLog, TipoEventoContratoAudit
        from apps.core.utils import get_client_ip, get_client_user_agent
        from apps.notificacoes.models import Notification
        from apps.accounts.models import User, UserRole

        link = AceiteLink.objects.select_related("contrato__cliente").filter(token=token).first()
        if not link:
            return Response({"detail": "Token de aceite não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if link.usado:
            data_formatada = link.usado_em.strftime("%d/%m/%Y às %H:%M") if link.usado_em else "data anterior"
            return Response(
                {"detail": f"Este contrato já teve o seu aceite formalizado em {data_formatada}."},
                status=status.HTTP_409_CONFLICT,
            )

        if timezone.now() > link.data_expiracao:
            data_expira = link.data_expiracao.strftime("%d/%m/%Y às %H:%M")
            return Response(
                {"detail": f"O prazo de aceite eletrônico deste contrato expirou em {data_expira} (validade de 30 dias)."},
                status=status.HTTP_410_GONE,
            )

        ip = get_client_ip(request)
        ua = get_client_user_agent(request)
        agora = timezone.now()

        # Marcação de uso único (Idempotência)
        link.usado = True
        link.usado_em = agora
        link.usado_ip = ip
        link.usado_user_agent = ua
        link.save(update_fields=["usado", "usado_em", "usado_ip", "usado_user_agent", "atualizado_em"])

        contrato = link.contrato
        contrato.status = StatusContrato.ATIVO
        contrato.data_aceite = agora
        contrato.save(update_fields=["status", "data_aceite", "atualizado_em"])

        # Registro de Auditoria Forense do Aceite
        gestor_info = contrato.gestor_nome or "Responsável pelo Contrato"
        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.ACEITE,
            descricao=(
                f"Aceite eletrônico do contrato {contrato.numero} formalizado com sucesso por '{gestor_info}' "
                f"via Magic Link. Início dos trabalhos e uso da franquia de {contrato.horas_contratadas:.1f}h autorizados."
            ),
            ip_origem=ip,
            user_agent=ua,
        )

        # Notificações no sistema para a equipe da empresa e clientes
        empresa_users = User.objects.filter(
            role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO],
            is_active=True,
        )
        cliente_users = User.objects.filter(
            cliente=contrato.cliente,
            role__in=[UserRole.CLIENTE_GERENTE, UserRole.CLIENTE_ANALISTA],
            is_active=True,
        ) if contrato.cliente else []

        notifs = [
            Notification(
                usuario=u,
                titulo=f"Contrato Ativado: {contrato.numero} — {contrato.cliente.display_name}",
                mensagem=f"O responsável formalizou o aceite do Contrato {contrato.numero}. Início dos trabalhos e uso do sistema liberados.",
                url=f"/contratos/{contrato.id}/extrato",
                lida=False,
            )
            for u in list(empresa_users) + list(cliente_users)
        ]
        if notifs:
            Notification.objects.bulk_create(notifs)

        # Disparo de e-mail de aviso de contrato ativado para toda a Empresa e e-mails de notificação listados
        from apps.contratos.email_service import ContratoEmailNotificacaoService
        ContratoEmailNotificacaoService.enviar_email_contrato_ativado(contrato, request=request)

        return Response({
            "detail": f"Aceite do Contrato {contrato.numero} formalizado com sucesso! Os trabalhos técnicos e o uso do sistema estão autorizados.",
            "contrato_numero": contrato.numero,
            "cliente_nome": contrato.cliente.display_name if contrato.cliente else "Cliente",
            "data_aceite": contrato.data_aceite.isoformat(),
            "ip_origem": ip,
        })


class ConfirmarEmailNotificacaoView(APIView):
    """
    Endpoint público acessível via Magic Link com validade de 15 dias para confirmação de e-mail de notificação.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        from apps.contratos.models import ContratoEmailNotificacao

        dest = (
            ContratoEmailNotificacao.objects.select_related("contrato", "contrato__cliente", "convidado_por")
            .filter(token=token)
            .first()
        )
        if not dest:
            return Response(
                {"detail": "Token de confirmação não encontrado ou link inválido."},
                status=status.HTTP_404_NOT_FOUND,
            )

        contrato = dest.contrato
        cliente = contrato.cliente
        convidador = dest.convidado_por
        convidador_nome = (convidador.get_full_name() or convidador.username) if convidador else "Gestor do Sistema"
        convidador_papel = convidador.get_role_display() if convidador else "Administrador"

        return Response({
            "token": str(dest.token),
            "email": dest.email,
            "nome": dest.nome,
            "contrato_id": contrato.id,
            "contrato_numero": contrato.numero,
            "cliente_nome": cliente.display_name if cliente else "Cliente",
            "cliente_logo": cliente.logo_url if cliente and hasattr(cliente, "logo_url") else None,
            "convidado_por_nome": convidador_nome,
            "convidado_por_papel": convidador_papel,
            "status": dest.status_calculado,
            "status_display": dest.get_status_display(),
            "ativo": dest.ativo,
            "is_expirado": dest.is_expirado,
            "dias_restantes": dest.dias_restantes,
            "expira_em": dest.expira_em.isoformat() if dest.expira_em else None,
            "confirmado_em": dest.confirmado_em.isoformat() if dest.confirmado_em else None,
        })

    def post(self, request, token):
        from apps.contratos.email_service import ContratoEmailNotificacaoService

        resultado = ContratoEmailNotificacaoService.processar_confirmacao(token, request)
        if not resultado["sucesso"]:
            status_code = status.HTTP_410_GONE if resultado["codigo"] == "token_expirado" else status.HTTP_404_NOT_FOUND
            return Response({"detail": resultado["mensagem"], "codigo": resultado["codigo"]}, status=status_code)

        dest = resultado["destinatario"]
        return Response({
            "detail": resultado["mensagem"],
            "codigo": resultado["codigo"],
            "email": dest.email,
            "contrato_numero": dest.contrato.numero,
            "confirmado_em": dest.confirmado_em.isoformat(),
        })


class RecusarEmailNotificacaoView(APIView):
    """
    Endpoint público para recusar recebimento de notificações.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        from apps.contratos.email_service import ContratoEmailNotificacaoService

        resultado = ContratoEmailNotificacaoService.processar_recusa(token, request)
        if not resultado["sucesso"]:
            return Response({"detail": resultado["mensagem"], "codigo": resultado["codigo"]}, status=status.HTTP_404_NOT_FOUND)

        dest = resultado["destinatario"]
        return Response({
            "detail": resultado["mensagem"],
            "codigo": resultado["codigo"],
            "email": dest.email,
            "contrato_numero": dest.contrato.numero,
        })