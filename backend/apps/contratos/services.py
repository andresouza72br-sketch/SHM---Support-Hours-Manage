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
        from rest_framework.exceptions import ValidationError as DRFValidationError

        numero_informado = dados.get("numero")
        if numero_informado and str(numero_informado).strip():
            numero = str(numero_informado).strip().upper()
            if Contrato.objects.filter(numero=numero).exists():
                raise DRFValidationError({"numero": f"Já existe um contrato cadastrado com o número {numero}."})
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

        # 1. Executar migração de saldo remanescente se solicitado (atômico)
        from apps.saldo.services import SaldoService

        resgatar_id = dados.get("resgatar_saldo_contrato_id")
        resgatar_horas = dados.get("resgatar_saldo_horas")
        if resgatar_id and resgatar_horas and float(resgatar_horas) > 0:
            try:
                SaldoService.migrar_saldo_contratos_vencidos(
                    contrato_origem_id=int(resgatar_id),
                    contrato_destino_id=contrato.id,
                    quantidade=Decimal(str(resgatar_horas)),
                    autor=usuario,
                    motivo=f"Aproveitamento e resgate de saldo remanescente na abertura do contrato {contrato.numero}",
                    ip_origem=ip,
                    user_agent=ua,
                )
                contrato.refresh_from_db()
            except Exception as migra_err:
                import logging
                logging.getLogger(__name__).error(f"Erro ao migrar saldo na abertura: {migra_err}", exc_info=True)

        # 2. Executar compensação de saldo devedor se solicitado (atômico)
        compensar_id = dados.get("compensar_debito_contrato_id")
        compensar_horas = dados.get("compensar_debito_horas")
        if compensar_id and compensar_horas and float(compensar_horas) > 0:
            try:
                SaldoService.compensar_debito_contrato_anterior(
                    contrato_novo_id=contrato.id,
                    contrato_devedor_id=int(compensar_id),
                    quantidade=Decimal(str(compensar_horas)),
                    autor=usuario,
                    motivo=f"Compensação e quitação de saldo devedor na abertura do contrato {contrato.numero}",
                    ip_origem=ip,
                    user_agent=ua,
                )
                contrato.refresh_from_db()
            except Exception as comp_err:
                import logging
                logging.getLogger(__name__).error(f"Erro ao compensar débito na abertura: {comp_err}", exc_info=True)

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