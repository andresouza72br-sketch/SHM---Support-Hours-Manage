import json
from datetime import date, timedelta
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from apps.contratos.models import (
    Contrato,
    StatusContrato,
    TipoContrato,
    ContratoDocumento,
    ContratoAuditLog,
    TipoEventoContratoAudit,
    AceiteLink,
)

class ContratoService:
    @staticmethod
    def gerar_numero(ano=None) -> str:
        import re
        ano = ano or timezone.localdate().year
        prefixo = f"CT-{ano}-"
        numeros = Contrato.objects.filter(numero__startswith=prefixo).values_list("numero", flat=True)
        max_seq = 0
        pattern = re.compile(rf"^{re.escape(prefixo)}(\d+)$")
        for num_str in numeros:
            match = pattern.match(num_str)
            if match:
                try:
                    num = int(match.group(1))
                    if num > max_seq:
                        max_seq = num
                except ValueError:
                    continue
        seq = max_seq + 1
        candidato = f"{prefixo}{seq:04d}"
        while Contrato.objects.filter(numero=candidato).exists():
            seq += 1
            candidato = f"{prefixo}{seq:04d}"
        return candidato

    @staticmethod
    @transaction.atomic
    def criar_contrato(dados, usuario, request=None) -> Contrato:
        numero_informado = dados.get("numero")
        if numero_informado and str(numero_informado).strip():
            numero = str(numero_informado).strip().upper()
        else:
            numero = ContratoService.gerar_numero()

        horas = Decimal(str(dados.get("horas_contratadas", "0.00")))
        saldo_inicial = horas

        # Processar emails_notificacao se vier como string JSON
        emails_notificacao = dados.get("emails_notificacao", [])
        if isinstance(emails_notificacao, str):
            try:
                emails_notificacao = json.loads(emails_notificacao)
            except Exception:
                emails_notificacao = []

        status_informado = dados.get("status", StatusContrato.PENDENTE_ACEITE)
        if not status_informado or status_informado not in StatusContrato.values:
            status_informado = StatusContrato.PENDENTE_ACEITE

        contrato = Contrato.objects.create(
            numero=numero,
            tipo=dados.get("tipo", TipoContrato.NOVO),
            contrato_referencia_id=dados.get("contrato_referencia") or None,
            cliente_id=dados.get("cliente"),
            data_inicio=dados.get("data_inicio"),
            data_termino=dados.get("data_termino") or None,
            horas_contratadas=horas,
            saldo=saldo_inicial,
            data_fim_carencia=dados.get("data_fim_carencia") or None,
            descricao_servicos=dados.get("descricao_servicos", ""),
            valor_mensal=dados.get("valor_mensal") or None,
            dia_faturamento=dados.get("dia_faturamento") or None,
            gestor_nome=dados.get("gestor_nome", ""),
            gestor_email=dados.get("gestor_email", ""),
            gestor_telefone=dados.get("gestor_telefone", ""),
            emails_notificacao=emails_notificacao,
            observacoes=dados.get("observacoes", ""),
            status=status_informado,
            criado_por=usuario,
        )

        from apps.core.utils import get_client_ip, get_client_user_agent
        ip = get_client_ip(request) if request else ""
        ua = get_client_user_agent(request) if request else ""

        ContratoAuditLog.objects.create(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.CRIACAO,
            descricao=f"Contrato {contrato.numero} cadastrado no sistema por {usuario.get_full_name() or usuario.username} com franquia de {horas:.1f}h.",
            usuario=usuario,
            ip_origem=ip,
            user_agent=ua,
        )

        aceite_link = AceiteLink.objects.create(
            contrato=contrato,
            data_expiracao=timezone.now() + timedelta(days=30),
        )

        from apps.contratos.email_service import ContratoEmailNotificacaoService

        # Disparar e-mail de formalização de aceite e início dos trabalhos para o responsável
        ContratoEmailNotificacaoService.enviar_email_aceite_contrato(
            contrato=contrato,
            aceite_link=aceite_link,
            request=request,
        )

        # Sincronizar e enviar e-mails de confirmação de lista de notificações com validade de 15 dias
        if emails_notificacao and isinstance(emails_notificacao, list):
            ContratoEmailNotificacaoService.sincronizar_destinatarios_contrato(
                contrato=contrato,
                lista_emails=emails_notificacao,
                usuario_solicitante=usuario,
                request=request,
            )

        return contrato