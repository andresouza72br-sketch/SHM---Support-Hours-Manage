import logging
from datetime import timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from apps.ciclos.models import Ciclo, StatusCiclo, CicloMagicLink, TipoAcaoMagicLink
from apps.pedidos.services import PedidoService

logger = logging.getLogger(__name__)

class CicloService:
    @staticmethod
    def gerar_magic_link(ciclo: Ciclo, tipo_acao: str, expira_em=None) -> CicloMagicLink:
        """
        Gera um token UUIDv4 criptográfico/seguro de uso único com expiração de 7 dias ou customizada.
        """
        if not expira_em:
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
        except Exception as e:
            logger.warning("Falha ao disparar notificação de 'orcamento_apresentado' para Ciclo #%s: %s", ciclo.id, e, exc_info=True)
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
        except Exception as e:
            logger.warning("Falha ao disparar notificação de 'orcamento_aprovado' para Ciclo #%s: %s", ciclo.id, e, exc_info=True)
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
        except Exception as e:
            logger.warning("Falha ao disparar notificação de 'orcamento_rejeitado' para Ciclo #%s: %s", ciclo.id, e, exc_info=True)
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
        except Exception as e:
            logger.warning("Falha ao disparar notificação de 'execucao_iniciada' para Ciclo #%s: %s", ciclo.id, e, exc_info=True)
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
        except Exception as e:
            logger.warning("Falha ao disparar notificação de 'aceite_solicitado' para Ciclo #%s: %s", ciclo.id, e, exc_info=True)
        return ciclo

    @staticmethod
    def validar_tolerancia_horas(
        horas_estimadas: Decimal,
        horas_realizadas: Decimal,
        justificativa: str = "",
    ) -> tuple[bool, Decimal]:
        """
        Valida a regra de política de tolerância de 30% sobre o orçamento aprovado (RF-CIC-05).
        Retorna (excesso_tolerancia: bool, limite_tolerancia: Decimal).
        Levanta ValidationError se as horas excederem 30% sem justificativa válida.
        """
        excesso = False
        limite = Decimal("0.00")
        if horas_estimadas and horas_estimadas > 0:
            limite = horas_estimadas * Decimal("1.30")
            if horas_realizadas > limite:
                excesso = True
                if not justificativa or not justificativa.strip():
                    raise ValidationError(
                        f"Horas realizadas ({horas_realizadas}h) excedem o limite de tolerância de 30% sobre o orçamento aprovado ({horas_estimadas}h). "
                        f"Limite permitido sem justificativa: {limite:.2f}h. "
                        f"Para aceitar o débito integral de {horas_realizadas}h do saldo, é obrigatório fornecer uma justificativa de aprovação de exceção."
                    )
        return excesso, limite

    @staticmethod
    @transaction.atomic
    def aceitar_ciclo(
        ciclo: Ciclo,
        usuario=None,
        ip_origem: str = None,
        user_agent: str = None,
        metodo: str = "APP",
        justificativa_excedente: str = "",
    ) -> Ciclo:
        # Validação da regra de tolerância de 30% sobre o orçamento aprovado
        excesso_tolerancia, limite_tolerancia = CicloService.validar_tolerancia_horas(
            horas_estimadas=ciclo.horas_estimadas,
            horas_realizadas=ciclo.horas_realizadas,
            justificativa=justificativa_excedente,
        )

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

        # Auditoria Forense se houve aceite de exceção acima da tolerância de +30%
        if excesso_tolerancia and ciclo.pedido and ciclo.pedido.contrato:
            from apps.contratos.models import ContratoAuditLog, TipoEventoContratoAudit
            ContratoAuditLog.objects.create(
                contrato=ciclo.pedido.contrato,
                tipo_evento=TipoEventoContratoAudit.ACEITE,
                descricao=(
                    f"Aceite de exceção formalizado para o Ciclo #{ciclo.id} com horas realizadas ({ciclo.horas_realizadas}h) "
                    f"acima da tolerância de +30% ({limite_tolerancia:.2f}h sobre {ciclo.horas_estimadas}h orçadas)."
                ),
                justificativa=f"Justificativa de aprovação do excedente: '{justificativa_excedente.strip()}'",
                usuario=ciclo.aceito_por,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )

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

        contrato = ciclo.pedido.contrato
        expiracao = None
        if contrato.data_termino:
            from datetime import datetime
            expiracao = timezone.make_aware(datetime.combine(contrato.data_termino, datetime.max.time()))
        else:
            from datetime import timedelta
            expiracao = timezone.now() + timedelta(days=90)
        magic_link_avaliacao = CicloService.gerar_magic_link(ciclo, TipoAcaoMagicLink.AVALIACAO_CICLO, expira_em=expiracao)

        try:
            from apps.notificacoes.services import NotificacaoService
            NotificacaoService.notificar_evento_ciclo(
                ciclo,
                "ciclo_aceito",
                usuario_autor=ciclo.aceito_por,
                justificativa=justificativa_excedente if excesso_tolerancia else "",
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
            
            destinatario_avaliacao = ciclo.aceito_por
            if not destinatario_avaliacao and ciclo.pedido and ciclo.pedido.cliente:
                from django.contrib.auth import get_user_model
                from apps.accounts.models import UserRole
                User = get_user_model()
                destinatario_avaliacao = User.objects.filter(
                    cliente=ciclo.pedido.cliente,
                    role=UserRole.CLIENTE_GERENTE,
                    is_active=True
                ).first()
                if not destinatario_avaliacao:
                    destinatario_avaliacao = User.objects.filter(
                        cliente=ciclo.pedido.cliente,
                        is_active=True
                    ).first()

            if magic_link_avaliacao and destinatario_avaliacao:
                NotificacaoService.enviar_email_avaliacao(ciclo, destinatario_avaliacao, magic_link_avaliacao)
        except Exception as e:
            logger.warning("Falha ao disparar notificação pós-aceite para Ciclo #%s: %s", ciclo.id, e, exc_info=True)
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
        except Exception as e:
            logger.warning("Falha ao disparar notificação de 'aceite_recusado' para Ciclo #%s: %s", ciclo.id, e, exc_info=True)
        return ciclo

    @staticmethod
    @transaction.atomic
    def registrar_avaliacao(
        ciclo: Ciclo,
        nota: int,
        comentario: str = "",
        usuario=None,
        ip_origem: str = "",
        user_agent: str = "",
        via_magic_link: bool = False,
    ) -> dict:
        """
        Registra ou atualiza a avaliação de satisfação (1 a 5 estrelas) de um ciclo aceito.
        Grava auditoria forense no contrato e dispara notificação de evento.
        """
        from apps.ciclos.models import AvaliacaoCiclo
        from apps.contratos.models import ContratoAuditLog, TipoEventoContratoAudit

        if ciclo.status != StatusCiclo.ACEITO:
            return {"sucesso": False, "codigo": "status_invalido", "mensagem": "Apenas ciclos aceitos podem ser avaliados."}

        try:
            nota_int = int(nota)
            if not (1 <= nota_int <= 5):
                return {"sucesso": False, "codigo": "nota_invalida", "mensagem": "Nota inválida. Informe um valor entre 1 e 5."}
        except (ValueError, TypeError):
            return {"sucesso": False, "codigo": "nota_invalida", "mensagem": "Nota inválida. Informe um valor entre 1 e 5."}

        avaliador_real = usuario if (hasattr(usuario, "is_authenticated") and usuario.is_authenticated) else ciclo.aceito_por
        if not avaliador_real and ciclo.pedido and ciclo.pedido.cliente:
            from django.contrib.auth import get_user_model
            from apps.accounts.models import UserRole
            User = get_user_model()
            avaliador_real = User.objects.filter(
                cliente=ciclo.pedido.cliente,
                role=UserRole.CLIENTE_GERENTE,
                is_active=True,
            ).first() or User.objects.filter(
                cliente=ciclo.pedido.cliente,
                is_active=True,
            ).first()

        if not avaliador_real:
            return {"sucesso": False, "codigo": "sem_avaliador", "mensagem": "Não foi possível determinar o avaliador."}

        comentario_str = (comentario or "").strip()
        avaliacao, created = AvaliacaoCiclo.objects.update_or_create(
            ciclo=ciclo,
            defaults={
                "avaliador": avaliador_real,
                "nota": nota_int,
                "comentario": comentario_str,
            },
        )

        acao_str = "criada" if created else "atualizada"
        via_str = " via Magic Link" if via_magic_link else ""
        pedido_protocolo = ciclo.pedido.protocolo if ciclo.pedido else f"#{ciclo.id}"
        contrato = ciclo.pedido.contrato if ciclo.pedido else None

        if contrato:
            ContratoAuditLog.objects.create(
                contrato=contrato,
                tipo_evento=TipoEventoContratoAudit.AVALIACAO_CICLO,
                descricao=f"Avaliação de satisfação {acao_str}{via_str} para o Ciclo #{ciclo.id} do Pedido {pedido_protocolo}.",
                justificativa=f"Nota: {nota_int}/5. Comentário: '{comentario_str}'",
                usuario=avaliador_real,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )

        try:
            from apps.notificacoes.services import NotificacaoService
            NotificacaoService.notificar_evento_ciclo(
                ciclo,
                "ciclo_avaliado",
                usuario_autor=avaliador_real,
                justificativa=f"Nota: {nota_int}/5.\n{comentario_str}",
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
        except Exception as e:
            logger.warning("Falha ao disparar notificação de 'ciclo_avaliado' para Ciclo #%s: %s", ciclo.id, e, exc_info=True)

        return {
            "sucesso": True,
            "avaliacao": avaliacao,
            "created": created,
            "mensagem": "Avaliação registrada com sucesso! Agradecemos o seu feedback.",
        }


class CicloMagicLinkService:
    @staticmethod
    def resolver_magic_link(token: str) -> CicloMagicLink:
        import uuid
        from django.db.models import Q
        token_str = str(token).strip()
        token_uuid = None
        try:
            token_uuid = uuid.UUID(token_str)
        except (ValueError, TypeError):
            pass

        # 1. Busca no modelo CicloMagicLink
        q_magic = Q(token=token_str)
        if token_uuid:
            q_magic |= Q(token=token_uuid) | Q(token=token_uuid.hex) | Q(token=str(token_uuid))

        magic_link = CicloMagicLink.objects.select_related(
            "ciclo__pedido__cliente",
            "ciclo__pedido__contrato",
            "ciclo__operador",
        ).prefetch_related("ciclo__tarefas").filter(q_magic).first()

        if magic_link:
            return magic_link

        # 2. Retrocompatibilidade com token_acesso legado no Ciclo
        q_ciclo = Q(token_acesso=token_str)
        if token_uuid:
            q_ciclo |= Q(token_acesso=token_uuid) | Q(token_acesso=token_uuid.hex) | Q(token_acesso=str(token_uuid))

        ciclo = Ciclo.objects.select_related(
            "pedido__cliente",
            "pedido__contrato",
            "operador",
        ).prefetch_related("tarefas").filter(q_ciclo).first()

        if ciclo:
            tipo_acao = (
                TipoAcaoMagicLink.APROVACAO_ORCAMENTO
                if ciclo.status in [StatusCiclo.ORCADO, StatusCiclo.AGUARDANDO_APROVACAO, StatusCiclo.APROVADO]
                else TipoAcaoMagicLink.ACEITE_CICLO
            )
            return CicloMagicLink.objects.create(
                ciclo=ciclo,
                tipo_acao=tipo_acao,
                token=ciclo.token_acesso,
                expira_em=timezone.now() + timedelta(days=7),
                usado=(ciclo.status in [StatusCiclo.APROVADO, StatusCiclo.EM_EXECUCAO, StatusCiclo.ACEITO]),
                usado_em=ciclo.aprovado_em or ciclo.aceito_em,
            )
        return None

    @staticmethod
    def obter_dados_visualizacao(magic_link: CicloMagicLink) -> dict:
        ciclo = magic_link.ciclo
        expirado = timezone.now() > magic_link.expira_em
        contrato = ciclo.pedido.contrato if (ciclo.pedido and ciclo.pedido.contrato) else None
        contrato_num = contrato.numero if contrato else "Contrato Vinculado"
        cliente = ciclo.pedido.cliente if (ciclo.pedido and ciclo.pedido.cliente) else None
        cliente_nome = (
            cliente.nome_fantasia if (cliente and cliente.nome_fantasia) else (
                cliente.razao_social if (cliente and cliente.razao_social) else "Cliente"
            )
        )
        saldo_atual = float(contrato.saldo) if contrato else 0.0

        horas_estimadas = float(ciclo.horas_estimadas) if ciclo.horas_estimadas else 0.0
        horas_realizadas = float(ciclo.horas_realizadas) if ciclo.horas_realizadas else 0.0
        limite_tolerancia = round(horas_estimadas * 1.30, 2)
        excede_tolerancia = horas_estimadas > 0 and horas_realizadas > limite_tolerancia

        return {
            "ciclo": ciclo,
            "pedido_protocolo": ciclo.pedido.protocolo if ciclo.pedido else "",
            "pedido_assunto": ciclo.pedido.assunto if ciclo.pedido else "",
            "cliente_nome": cliente_nome,
            "contrato_numero": contrato_num,
            "contrato_saldo": saldo_atual,
            "tipo_acao": magic_link.tipo_acao,
            "excede_tolerancia": excede_tolerancia,
            "limite_tolerancia": limite_tolerancia,
            "expirado": expirado,
            "expira_em": magic_link.expira_em.isoformat(),
            "usado": magic_link.usado,
            "usado_em": magic_link.usado_em.isoformat() if magic_link.usado_em else None,
        }

    @staticmethod
    @transaction.atomic
    def processar_acao(
        magic_link: CicloMagicLink,
        acao: str,
        dados: dict = None,
        usuario=None,
        ip_origem: str = "",
        user_agent: str = "",
    ) -> dict:
        dados = dados or {}

        if acao in ["rejeitar", "recusar"]:
            return {
                "sucesso": False,
                "status_code": 403,
                "mensagem": "Operação não permitida via Magic Link. A recusa com justificativa técnica deve ser realizada exclusivamente via app/plataforma.",
            }

        if magic_link.usado:
            data_formatada = magic_link.usado_em.strftime("%d/%m/%Y às %H:%M") if magic_link.usado_em else "data anterior"
            return {
                "sucesso": False,
                "status_code": 409,
                "mensagem": f"Este link seguro de uso único já foi consumido em {data_formatada}.",
            }

        if timezone.now() > magic_link.expira_em:
            data_expira = magic_link.expira_em.strftime("%d/%m/%Y às %H:%M")
            return {
                "sucesso": False,
                "status_code": 410,
                "mensagem": f"Este link seguro expirou em {data_expira} (validade de 7 dias). Solicite um novo link ou acesse o app.",
            }

        ciclo = magic_link.ciclo
        pedido = ciclo.pedido
        contrato = pedido.contrato if (pedido and pedido.contrato) else None
        contrato_num = contrato.numero if contrato else "Contrato Vinculado"
        cliente = pedido.cliente if (pedido and pedido.cliente) else None
        cliente_nome = (
            cliente.nome_fantasia if (cliente and cliente.nome_fantasia) else (
                cliente.razao_social if (cliente and cliente.razao_social) else "Cliente"
            )
        )

        if acao == "aprovar":
            CicloService.aprovar_orcamento(
                ciclo=ciclo,
                usuario=usuario,
                ip_origem=ip_origem,
                user_agent=user_agent,
                metodo="MAGIC_LINK",
            )
            msg = f"Orçamento de {float(ciclo.horas_estimadas):.1f}h do Pedido {pedido.protocolo} ({cliente_nome} / Contrato {contrato_num}) aprovado com sucesso via Magic Link."
        elif acao == "aceitar":
            justificativa_excedente = dados.get("justificativa_excedente", "")
            try:
                CicloService.aceitar_ciclo(
                    ciclo=ciclo,
                    usuario=usuario,
                    ip_origem=ip_origem,
                    user_agent=user_agent,
                    metodo="MAGIC_LINK",
                    justificativa_excedente=justificativa_excedente,
                )
            except ValidationError as e:
                return {
                    "sucesso": False,
                    "status_code": 400,
                    "mensagem": str(e.message if hasattr(e, "message") else e),
                }

            if contrato:
                contrato.refresh_from_db()
                saldo_restante = float(contrato.saldo)
            else:
                saldo_restante = 0.0
            msg = f"Aceite final concedido com sucesso! Foram debitadas {float(ciclo.horas_realizadas):.1f}h do Contrato {contrato_num} da empresa {cliente_nome}. Saldo restante: {saldo_restante:.1f}h."
        elif acao == "avaliar":
            res_av = CicloService.registrar_avaliacao(
                ciclo=ciclo,
                nota=dados.get("nota"),
                comentario=dados.get("comentario", ""),
                usuario=usuario,
                ip_origem=ip_origem,
                user_agent=user_agent,
                via_magic_link=True,
            )
            if not res_av["sucesso"]:
                return {
                    "sucesso": False,
                    "status_code": 400,
                    "mensagem": res_av["mensagem"],
                }
            msg = res_av["mensagem"]
        else:
            return {
                "sucesso": False,
                "status_code": 400,
                "mensagem": "Ação inválida para o Magic Link.",
            }

        # Marca token como consumido (Single-Use)
        magic_link.usado = True
        magic_link.usado_em = timezone.now()
        magic_link.usado_ip = ip_origem
        magic_link.usado_user_agent = user_agent
        magic_link.save(update_fields=["usado", "usado_em", "usado_ip", "usado_user_agent", "atualizado_em"])

        return {
            "sucesso": True,
            "status_code": 200,
            "payload": {
                "detail": msg,
                "contrato_numero": contrato_num,
                "cliente_nome": cliente_nome,
                "usado_em": magic_link.usado_em.isoformat(),
                "ip_origem": ip_origem,
                "metodo": "MAGIC_LINK",
            },
        }