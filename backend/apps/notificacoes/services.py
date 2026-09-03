import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from apps.notificacoes.models import Notification, TimelineEvent, TipoEventoTimeline
from apps.notificacoes.email_templates import renderizar_email_transacional
from apps.accounts.models import User, UserRole

logger = logging.getLogger(__name__)

class NotificacaoService:
    @staticmethod
    def _obter_info_autor_e_origem(autor, cliente):
        """
        Retorna tupla normalizada (autor_nome, origem).
        """
        if autor and hasattr(autor, "is_authenticated") and not autor.is_authenticated:
            autor = None
        autor_nome = (autor.get_full_name() or autor.username) if autor else "Usuário"
        if autor and getattr(autor, "is_empresa", False):
            origem = "Empresa"
        elif cliente:
            origem = cliente.nome_fantasia or cliente.razao_social or "Cliente"
        else:
            origem = "Cliente"
        return autor_nome, origem

    @staticmethod
    def _obter_destinatarios_envolvidos(pedido, ciclo=None, autor=None):
        """
        Coleta o conjunto consolidado de usuários envolvidos (Cliente + Empresa + Operador), descartando o autor.
        """
        destinatarios = set()
        if pedido and pedido.cliente:
            destinatarios.update(User.objects.filter(cliente=pedido.cliente, is_active=True))
        destinatarios.update(User.objects.filter(
            role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO],
            is_active=True,
        ))
        if ciclo and ciclo.operador and ciclo.operador.is_active:
            destinatarios.add(ciclo.operador)
        if autor:
            destinatarios.discard(autor)
        return destinatarios

    @staticmethod
    def notificar_novo_pedido(pedido):
        """
        Gera notificações e evento na timeline quando um novo pedido é aberto:
        - Notifica todos os usuários da Empresa (Admins e Técnicos) e todos os usuários do Cliente vinculado,
          exceto o próprio autor do chamado.
        - Registra o evento PEDIDO_CRIADO na Timeline.
        """
        if not pedido:
            return

        autor = pedido.criado_por
        autor_nome, origem = NotificacaoService._obter_info_autor_e_origem(autor, pedido.cliente)
        url_destino = f"/pedidos/{pedido.id}"

        # 1. Registra evento na timeline
        try:
            TimelineEvent.objects.create(
                pedido=pedido,
                tipo=TipoEventoTimeline.PEDIDO_CRIADO,
                descricao=f"Pedido {pedido.protocolo} aberto por {autor_nome} ({origem})",
                autor=autor,
            )
        except Exception as e:
            logger.warning("Falha ao registrar TimelineEvent para novo pedido %s: %s", getattr(pedido, "protocolo", pedido), e)

        # 2. Consulta regras dinâmicas de notificação configuradas pelo Admin
        from apps.notificacoes.config_service import NotificacaoConfigService
        enviar_email, enviar_in_app, dests_cfg, emails_cc = NotificacaoConfigService.resolver_destinatarios_evento(
            codigo="PEDIDO_CRIADO",
            pedido=pedido,
            autor=autor,
        )

        cfg = NotificacaoConfigService.obter_configuracao("PEDIDO_CRIADO")
        destinatarios_set = dests_cfg if cfg else NotificacaoService._obter_destinatarios_envolvidos(pedido, autor=autor)

        # Formata título e mensagem
        contrato_info = f" (Contrato {pedido.contrato.numero})" if pedido.contrato else ""
        titulo = f"Novo Pedido: {pedido.protocolo} - {pedido.assunto}"
        desc_resumo = (pedido.descricao[:100] + "...") if len(pedido.descricao) > 100 else pedido.descricao
        mensagem = f"{autor_nome} ({origem}) abriu um novo pedido{contrato_info}: \"{desc_resumo}\""

        if enviar_in_app and destinatarios_set:
            notificacoes = [
                Notification(
                    usuario=dest,
                    titulo=titulo,
                    mensagem=mensagem,
                    url=url_destino,
                    lida=False,
                )
                for dest in destinatarios_set
            ]
            if notificacoes:
                Notification.objects.bulk_create(notificacoes)

        if enviar_email:
            destinatarios_email = set(destinatarios_set)
            if destinatarios_email or emails_cc:
                NotificacaoService._enviar_email(
                    destinatarios=destinatarios_email,
                    assunto=titulo,
                    mensagem_texto=mensagem,
                    url_destino=url_destino,
                    cta_texto="Visualizar Pedido no SHM",
                    cc=emails_cc,
                )

    @staticmethod
    def notificar_novo_comentario(comentario):
        """
        Gera notificações quando qualquer comentário é postado:
        - Notifica TODOS os usuários envolvidos (todos os usuários do Cliente e toda a equipe da Empresa),
          exceto o próprio autor do comentário.
        """
        ciclo = comentario.ciclo or (comentario.tarefa.ciclo if comentario.tarefa else None)
        if not ciclo or not ciclo.pedido:
            return

        pedido = ciclo.pedido
        autor = comentario.autor
        autor_nome, origem = NotificacaoService._obter_info_autor_e_origem(autor, pedido.cliente)

        # Resumo do texto do comentário (máximo 120 caracteres)
        texto_limpo = (comentario.texto or "").strip()
        texto_resumo = (texto_limpo[:117] + "...") if len(texto_limpo) > 120 else texto_limpo
        url_destino = f"/pedidos/{pedido.id}?ciclo={ciclo.id}"

        from apps.notificacoes.config_service import NotificacaoConfigService
        enviar_email, enviar_in_app, dests_cfg, emails_cc = NotificacaoConfigService.resolver_destinatarios_evento(
            codigo="COMENTARIO_CRIADO",
            pedido=pedido,
            ciclo=ciclo,
            autor=autor,
        )

        destinatarios_set = dests_cfg if dests_cfg else NotificacaoService._obter_destinatarios_envolvidos(pedido, ciclo=ciclo, autor=autor)

        # Formatação de título e mensagem
        tipo_ciclo_nome = ciclo.get_tipo_display() if hasattr(ciclo, "get_tipo_display") else ciclo.tipo
        titulo = f"Novo Comentário: {pedido.protocolo} - {tipo_ciclo_nome}"
        mensagem = f"{autor_nome} ({origem}): \"{texto_resumo}\""

        # Cria as notificações no banco em lote
        if enviar_in_app and destinatarios_set:
            notificacoes = [
                Notification(
                    usuario=dest,
                    titulo=titulo,
                    mensagem=mensagem,
                    url=url_destino,
                    lida=False,
                )
                for dest in destinatarios_set
            ]
            if notificacoes:
                Notification.objects.bulk_create(notificacoes)

        if enviar_email and destinatarios_set:
            NotificacaoService._enviar_email(
                destinatarios=destinatarios_set,
                assunto=titulo,
                mensagem_texto=mensagem,
                url_destino=url_destino,
                cta_texto="Ver Comentário no SHM",
                cc=emails_cc,
            )


    @staticmethod
    def _obter_destinatarios_email_por_grupo(grupo: str, pedido, ciclo, autor=None):
        """
        Coleta destinatários de e-mail conforme a regra de governança B2B do evento.
        """
        destinatarios = set()
        if grupo == "aprovador_cliente":
            destinatarios.update(User.objects.filter(
                cliente=pedido.cliente,
                role=UserRole.CLIENTE_GERENTE,
                is_active=True,
            ))
        elif grupo == "equipe_empresa":
            destinatarios.update(User.objects.filter(
                role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO],
                is_active=True,
            ))
            if ciclo.operador and ciclo.operador.is_active:
                destinatarios.add(ciclo.operador)
        elif grupo == "acompanhamento_cliente":
            destinatarios.update(User.objects.filter(
                cliente=pedido.cliente,
                is_active=True,
            ))
        if autor:
            destinatarios.discard(autor)
        return destinatarios

    @staticmethod
    def _montar_payload_evento_ciclo(ciclo, tipo_evento: str, autor_nome: str, origem: str, justificativa: str, magic_link_path: str):
        """
        Monta dicionário com metadados do evento (título, mensagem, timeline, link, cta e grupo de e-mail).
        """
        pedido = ciclo.pedido
        tipo_nome = ciclo.get_tipo_display() if hasattr(ciclo, "get_tipo_display") else ciclo.tipo
        contrato = pedido.contrato
        contrato_num = contrato.numero if contrato else "Contrato Vinculado"
        cliente_nome = pedido.cliente.nome_fantasia if (pedido.cliente and pedido.cliente.nome_fantasia) else (
            pedido.cliente.razao_social if (pedido.cliente and pedido.cliente.razao_social) else "Cliente"
        )
        saldo_atual = f"{contrato.saldo:.1f}" if contrato else "0.0"

        if tipo_evento == "orcamento_apresentado":
            return {
                "titulo": f"Orçamento Apresentado: {pedido.protocolo} - {tipo_nome} ({ciclo.horas_estimadas:.1f}h)",
                "url_destino": magic_link_path,
                "mensagem": (
                    f"{autor_nome} ({origem}) apresentou o orçamento de {ciclo.horas_estimadas:.1f}h para {tipo_nome} no Pedido {pedido.protocolo} ({cliente_nome} / Contrato {contrato_num}).\n\n"
                    f"• Link Seguro (Validade: 7 dias): Aprovar Orçamento\n"
                    f"• AVISO: Caso deseje Não Aprovar / Recusar este orçamento, a operação deve ser realizada exclusivamente via app/plataforma com a respectiva justificativa."
                ),
                "timeline_tipo": TipoEventoTimeline.ORCAMENTO_APRESENTADO,
                "timeline_desc": f"Orçamento de {ciclo.horas_estimadas:.1f}h apresentado por {autor_nome} ({origem}) para o Contrato {contrato_num}",
                "cta_btn": f"Aprovar Orçamento ({ciclo.horas_estimadas:.1f}h)",
                "email_grupo": "aprovador_cliente",
            }
        elif tipo_evento == "orcamento_aprovado":
            return {
                "titulo": f"Orçamento Aprovado: {pedido.protocolo} - {tipo_nome} ({ciclo.horas_estimadas:.1f}h)",
                "url_destino": f"/admin/ciclos/{ciclo.id}/execucao" if ciclo.id else f"/pedidos/{pedido.id}",
                "mensagem": (
                    f"{autor_nome} ({origem}) aprovou o orçamento de {ciclo.horas_estimadas:.1f}h para o Pedido {pedido.protocolo} ({cliente_nome} / Contrato {contrato_num}).\n\n"
                    f"A equipe técnica da Empresa está autorizada a iniciar a execução das tarefas."
                ),
                "timeline_tipo": TipoEventoTimeline.ORCAMENTO_APROVADO,
                "timeline_desc": f"Orçamento de {ciclo.horas_estimadas:.1f}h aprovado por {autor_nome} ({origem}) no Contrato {contrato_num}",
                "cta_btn": "Iniciar Execução Técnica no SHM",
                "email_grupo": "equipe_empresa",
            }
        elif tipo_evento == "orcamento_rejeitado":
            return {
                "titulo": f"Orçamento Rejeitado: {pedido.protocolo} - {tipo_nome}",
                "url_destino": f"/pedidos/{pedido.id}",
                "mensagem": f"{autor_nome} ({origem}) rejeitou o orçamento para o Pedido {pedido.protocolo}. Motivo: \"{justificativa}\"",
                "timeline_tipo": TipoEventoTimeline.ORCAMENTO_REJEITADO,
                "timeline_desc": f"Orçamento rejeitado por {autor_nome} ({origem}) no Contrato {contrato_num}. Motivo: {justificativa}",
                "cta_btn": "Revisar Orçamento no SHM",
                "email_grupo": "equipe_empresa",
            }
        elif tipo_evento == "execucao_iniciada":
            return {
                "titulo": f"Execução Iniciada: {pedido.protocolo} - {tipo_nome}",
                "url_destino": f"/pedidos/{pedido.id}",
                "mensagem": f"{autor_nome} ({origem}) iniciou a execução técnica do Pedido {pedido.protocolo} ({tipo_nome}) pelo Contrato {contrato_num} ({cliente_nome}).",
                "timeline_tipo": TipoEventoTimeline.EXECUCAO_INICIADA,
                "timeline_desc": f"Execução técnica de {tipo_nome} iniciada por {autor_nome} ({origem}) no Contrato {contrato_num}",
                "cta_btn": "Acompanhar Pedido no SHM",
                "email_grupo": "acompanhamento_cliente",
            }
        elif tipo_evento == "aceite_solicitado":
            return {
                "titulo": f"Aceite Solicitado: {pedido.protocolo} - {tipo_nome} ({ciclo.horas_realizadas:.1f}h)",
                "url_destino": magic_link_path,
                "mensagem": (
                    f"{autor_nome} ({origem}) finalizou a execução técnica ({ciclo.horas_realizadas:.1f}h) do Pedido {pedido.protocolo} e solicitou o aceite do cliente.\n\n"
                    f"• Contrato: {contrato_num} ({cliente_nome})\n"
                    f"• Link Seguro (Validade: 7 dias): Aceitar Entrega / De acordo em Debitar horas realizadas\n"
                    f"• AVISO: Caso deseje Recusar o aceite, o processo deve ser realizado exclusivamente via app/plataforma informando a justificativa técnica obrigatória."
                ),
                "timeline_tipo": TipoEventoTimeline.ACEITE_SOLICITADO,
                "timeline_desc": f"Aceite solicitado por {autor_nome} ({origem}) com {ciclo.horas_realizadas:.1f}h realizadas no Contrato {contrato_num}",
                "cta_btn": f"Aceitar Entrega / De acordo em Debitar ({ciclo.horas_realizadas:.1f}h)",
                "email_grupo": "aprovador_cliente",
            }
        elif tipo_evento == "ciclo_aceito":
            return {
                "titulo": f"Aceite Concedido & Saldo Debitado: {pedido.protocolo} - {tipo_nome}",
                "url_destino": f"/pedidos/{pedido.id}",
                "mensagem": (
                    f"{autor_nome} ({origem}) concedeu o aceite final do Pedido {pedido.protocolo} ({tipo_nome}).\n\n"
                    f"Foram debitadas {ciclo.horas_realizadas:.1f}h do Contrato {contrato_num} da empresa {cliente_nome}. Saldo remanescente: {saldo_atual}h."
                ),
                "timeline_tipo": TipoEventoTimeline.CICLO_ACEITO,
                "timeline_desc": f"Aceite final concedido por {autor_nome} ({origem}). Débito de {ciclo.horas_realizadas:.1f}h no Contrato {contrato_num} ({cliente_nome}). Saldo restante: {saldo_atual}h",
                "cta_btn": "Visualizar Pedido Concluído no SHM",
                "email_grupo": "equipe_empresa",
            }
        elif tipo_evento == "aceite_recusado":
            return {
                "titulo": f"Aceite Recusado: {pedido.protocolo} - {tipo_nome}",
                "url_destino": f"/pedidos/{pedido.id}",
                "mensagem": f"{autor_nome} ({origem}) recusou o aceite do Pedido {pedido.protocolo} ({tipo_nome}) no Contrato {contrato_num}. Justificativa: \"{justificativa}\"",
                "timeline_tipo": TipoEventoTimeline.ACEITE_RECUSADO,
                "timeline_desc": f"Aceite recusado por {autor_nome} ({origem}) no Contrato {contrato_num}. Justificativa: {justificativa}",
                "cta_btn": "Ver Justificativa de Recusa no SHM",
                "email_grupo": "equipe_empresa",
            }
        elif tipo_evento == "ciclo_avaliado":
            return {
                "titulo": f"Atendimento Avaliado: {pedido.protocolo} - {tipo_nome}",
                "url_destino": f"/pedidos/{pedido.id}",
                "mensagem": (
                    f"{autor_nome} ({origem}) avaliou o atendimento do Pedido {pedido.protocolo} ({tipo_nome}).\n\n"
                    f"{justificativa}"
                ),
                "timeline_tipo": None,
                "timeline_desc": None,
                "cta_btn": "Visualizar no Portal SHM",
                "email_grupo": None,
            }
        return None

    @staticmethod
    def notificar_evento_ciclo(
        ciclo,
        tipo_evento: str,
        usuario_autor=None,
        justificativa: str = "",
        ip_origem: str = None,
        user_agent: str = None,
        token_magic_link=None,
    ):
        """
        Notificações de ciclo de vida (orçamento, aprovação, execução, aceite).
        Notifica TODOS os usuários do Cliente e da Empresa envolvidos, EXCETO o próprio autor da ação.
        Registra também o evento correspondente na Timeline com auditoria forense.
        """
        if not ciclo or not ciclo.pedido:
            return

        pedido = ciclo.pedido
        autor = usuario_autor if (usuario_autor and hasattr(usuario_autor, "is_authenticated") and usuario_autor.is_authenticated) else None
        autor_nome, origem = NotificacaoService._obter_info_autor_e_origem(autor, pedido.cliente)
        magic_link_path = f"/magic-link/{token_magic_link.token}" if token_magic_link else f"/pedidos/{pedido.id}"

        payload = NotificacaoService._montar_payload_evento_ciclo(
            ciclo=ciclo,
            tipo_evento=tipo_evento,
            autor_nome=autor_nome,
            origem=origem,
            justificativa=justificativa,
            magic_link_path=magic_link_path,
        )
        if not payload:
            return

        # 1. Timeline Event com Auditoria Forense
        if payload.get("timeline_tipo") and payload.get("timeline_desc"):
            try:
                TimelineEvent.objects.create(
                    pedido=pedido,
                    ciclo=ciclo,
                    tipo=payload["timeline_tipo"],
                    descricao=payload["timeline_desc"],
                    autor=autor,
                    ip_origem=ip_origem,
                    user_agent=user_agent,
                )
            except Exception as e:
                logger.warning("Falha ao registrar TimelineEvent no ciclo %s: %s", getattr(ciclo, "id", ciclo), e)

        # 2. Notificações para todos os envolvidos, exceto o autor
        MAPA_EVENTO_CODIGO = {
            "orcamento_apresentado": "ORCAMENTO_APRESENTADO",
            "orcamento_aprovado": "ORCAMENTO_APROVADO",
            "orcamento_rejeitado": "ORCAMENTO_REJEITADO",
            "execucao_iniciada": "EXECUCAO_INICIADA",
            "aceite_solicitado": "ACEITE_SOLICITADO",
            "ciclo_aceito": "CICLO_ACEITO",
            "aceite_recusado": "ACEITE_RECUSADO",
            "ciclo_avaliado": "AVALIACAO_ATENDIMENTO",
        }
        codigo_config = MAPA_EVENTO_CODIGO.get(tipo_evento, tipo_evento.upper())
        from apps.notificacoes.config_service import NotificacaoConfigService
        enviar_email, enviar_in_app, dests_cfg, emails_cc_cfg = NotificacaoConfigService.resolver_destinatarios_evento(
            codigo=codigo_config,
            pedido=pedido,
            ciclo=ciclo,
            autor=autor,
        )

        destinatarios_set = dests_cfg if dests_cfg else NotificacaoService._obter_destinatarios_envolvidos(pedido, ciclo=ciclo, autor=autor)

        if enviar_in_app and destinatarios_set and payload.get("titulo"):
            url_notificacao_app = f"/pedidos/{pedido.id}?ciclo={ciclo.id}"
            notificacoes = [
                Notification(
                    usuario=dest,
                    titulo=payload["titulo"],
                    mensagem=payload["mensagem"],
                    url=url_notificacao_app,
                    lida=False,
                )
                for dest in destinatarios_set
            ]
            if notificacoes:
                Notification.objects.bulk_create(notificacoes)

        # 3. Disparo de E-mail Real (SMTP / Console) com Regras Estritas de Governança
        if enviar_email and payload.get("titulo"):
            email_grupo = payload.get("email_grupo")
            destinatarios_email = set()
            if email_grupo:
                destinatarios_email = NotificacaoService._obter_destinatarios_email_por_grupo(
                    grupo=email_grupo,
                    pedido=pedido,
                    ciclo=ciclo,
                    autor=autor,
                )
            else:
                destinatarios_email = set(destinatarios_set)

            cc_emails = list(emails_cc_cfg)
            if tipo_evento in ["orcamento_apresentado", "aceite_solicitado"]:
                # Se o cliente não possuir nenhum CLIENTE_GERENTE ativo cadastrado,
                # utiliza Cliente.email_contato como fallback para garantir o recebimento
                if not destinatarios_email and pedido.cliente and pedido.cliente.email_contato:
                    destinatarios_email = [pedido.cliente.email_contato]

                # Adiciona os e-mails cadastrados em Cliente.emails_notificacao_padrao em cópia (CC)
                if pedido.cliente:
                    cc_extras = NotificacaoService._extrair_emails_lista(pedido.cliente.emails_notificacao_padrao)
                    cc_emails = list(dict.fromkeys(cc_emails + cc_extras))

            if destinatarios_email or cc_emails:
                NotificacaoService._enviar_email(
                    destinatarios=destinatarios_email,
                    assunto=payload["titulo"],
                    mensagem_texto=payload["mensagem"],
                    url_destino=payload["url_destino"],
                    cta_texto=payload["cta_btn"],
                    cc=cc_emails,
                )

    @staticmethod
    def notificar_alerta_saldo(contrato, tipo_alerta: str, saldo_anterior=None, saldo_novo=None):
        """
        Gera notificações in-app e e-mail transacional de consumo de saldo:
        - tipo_alerta == '80_porcento': 80% da franquia consumida (saldo <= 20%)
        - tipo_alerta == 'saldo_esgotado': franquia zerada ou devedora (saldo <= 0)
        """
        from apps.notificacoes.config_service import NotificacaoConfigService
        codigo = "SALDO_ALERTA_80_PORCENTO" if tipo_alerta == "80_porcento" else "SALDO_ESGOTADO_OU_NEGATIVO"

        enviar_email, enviar_in_app, dests_usuarios, emails_cc = NotificacaoConfigService.resolver_destinatarios_evento(
            codigo=codigo,
            contrato=contrato,
            cliente=contrato.cliente,
        )

        cliente_nome = contrato.cliente.display_name if contrato.cliente else "Cliente"
        franquia = f"{float(contrato.horas_contratadas):.1f}h"
        saldo_atual_num = float(saldo_novo if saldo_novo is not None else contrato.saldo)
        saldo_str = f"{saldo_atual_num:.1f}h"

        if tipo_alerta == "80_porcento":
            titulo = f"Alerta de Consumo: 80% da Franquia Atingida (Contrato {contrato.numero})"
            mensagem = (
                f"Atenção: O contrato de suporte {contrato.numero} ({cliente_nome}) atingiu 80% de consumo da franquia contratada.\n\n"
                f"• Franquia Contratada: {franquia}\n"
                f"• Saldo Disponível Restante: {saldo_str}\n\n"
                f"Recomendamos o acompanhamento do extrato de horas para planejamento de eventuais aditivos ou reabastecimentos."
            )
            cta_texto = "Visualizar Extrato de Horas no SHM"
        else:
            titulo = f"URGENTE: Saldo de Horas Esgotado (Contrato {contrato.numero})"
            mensagem = (
                f"Aviso Crítico: O contrato de suporte {contrato.numero} ({cliente_nome}) atingiu o limite de consumo da sua franquia de horas.\n\n"
                f"• Franquia Contratada: {franquia}\n"
                f"• Saldo Atual: {saldo_str} ({'Saldo Zerado' if saldo_atual_num == 0 else 'Saldo Devedor'})\n\n"
                f"Novas demandas técnicas podem demandar aprovação de reabastecimento de saldo para continuidade."
            )
            cta_texto = "Ver Extrato & Reabastecer Saldo"

        url_destino = f"/contratos/{contrato.id}/extrato"

        if enviar_in_app and dests_usuarios:
            notifs = [
                Notification(
                    usuario=u,
                    titulo=titulo,
                    mensagem=mensagem,
                    url=url_destino,
                    lida=False,
                )
                for u in dests_usuarios
            ]
            if notifs:
                Notification.objects.bulk_create(notifs)

        if enviar_email:
            destinatarios_finais = list(dests_usuarios)
            if not destinatarios_finais and contrato.gestor_email:
                destinatarios_finais.append(contrato.gestor_email)
            if destinatarios_finais or emails_cc:
                NotificacaoService._enviar_email(
                    destinatarios=destinatarios_finais,
                    assunto=titulo,
                    mensagem_texto=mensagem,
                    url_destino=url_destino,
                    cta_texto=cta_texto,
                    cc=emails_cc,
                )


    @staticmethod
    def notificar_expiracao_proxima(contrato, dias_restantes: int):
        """
        Gera notificações in-app e e-mail de proximidade de término de vigência do contrato.
        """
        from apps.notificacoes.config_service import NotificacaoConfigService
        from apps.contratos.models import ContratoAuditLog, TipoEventoContratoAudit
        enviar_email, enviar_in_app, dests_usuarios, emails_cc = NotificacaoConfigService.resolver_destinatarios_evento(
            codigo="CONTRATO_EXPIRACAO_PROXIMA",
            contrato=contrato,
            cliente=contrato.cliente,
        )

        cliente_nome = contrato.cliente.display_name if contrato.cliente else "Cliente"
        data_fim_str = contrato.data_termino.strftime("%d/%m/%Y") if contrato.data_termino else "A definir"
        titulo = f"Vigência Próxima do Fim: Contrato {contrato.numero} ({dias_restantes} dias restantes)"
        mensagem = (
            f"Aviso de Vigência: O contrato de suporte {contrato.numero} ({cliente_nome}) "
            f"está a {dias_restantes} dia(s) do término de sua vigência ({data_fim_str}).\n\n"
            f"• Franquia Contratada: {contrato.horas_contratadas:.1f}h\n"
            f"• Saldo Disponível: {contrato.saldo:.1f}h\n"
            f"• Data Limite: {data_fim_str}\n\n"
            f"Recomendamos o planejamento da renovação ou aditivo contratual para evitar interrupção no suporte."
        )
        url_destino = f"/contratos/{contrato.id}/extrato"

        if enviar_in_app and dests_usuarios:
            notifs = [
                Notification(
                    usuario=u,
                    titulo=titulo,
                    mensagem=mensagem,
                    url=url_destino,
                    lida=False,
                )
                for u in dests_usuarios
            ]
            if notifs:
                Notification.objects.bulk_create(notifs)

        if enviar_email:
            destinatarios_finais = list(dests_usuarios)
            if not destinatarios_finais and contrato.gestor_email:
                destinatarios_finais.append(contrato.gestor_email)
            if destinatarios_finais or emails_cc:
                NotificacaoService._enviar_email(
                    destinatarios=destinatarios_finais,
                    assunto=titulo,
                    mensagem_texto=mensagem,
                    url_destino=url_destino,
                    cta_texto="Acompanhar Contrato no SHM",
                    cc=emails_cc,
                )

        try:
            ContratoAuditLog.objects.create(
                contrato=contrato,
                tipo_evento=TipoEventoContratoAudit.ALTERACAO,
                descricao=f"Alerta de término de vigência próximo ({dias_restantes} dias até {data_fim_str}) enviado com sucesso.",
            )
        except Exception as audit_err:
            logger.warning("Falha ao registrar auditoria de alerta de expiração do contrato %s: %s", contrato.numero, audit_err)

    @staticmethod
    def _extrair_emails_lista(emails_input) -> list[str]:
        """
        Extrai e normaliza uma lista de endereços de e-mail válidos a partir de JSONField (lista de strings ou dicts) ou string.
        """
        resultado = []
        if not emails_input:
            return resultado
        if isinstance(emails_input, list):
            for item in emails_input:
                if isinstance(item, str) and "@" in item.strip():
                    resultado.append(item.strip())
                elif isinstance(item, dict):
                    email_val = item.get("email")
                    if email_val and isinstance(email_val, str) and "@" in email_val.strip():
                        if item.get("ativo", True):
                            resultado.append(email_val.strip())
        elif isinstance(emails_input, str) and emails_input.strip():
            for e in emails_input.replace(";", ",").split(","):
                if "@" in e.strip():
                    resultado.append(e.strip())
        return list(dict.fromkeys(resultado))

    @staticmethod
    def enviar_email_avaliacao(ciclo, destinatario, magic_link):
        """
        Envia o e-mail de pesquisa de satisfação para o cliente que deu o aceite.
        """
        from apps.notificacoes.config_service import NotificacaoConfigService
        cfg = NotificacaoConfigService.obter_configuracao("AVALIACAO_ATENDIMENTO")
        enviar_email = cfg.ativo_email if cfg else True
        enviar_in_app = cfg.ativo_in_app if cfg else True

        if not enviar_email and not enviar_in_app:
            return

        pedido = ciclo.pedido
        tipo_nome = ciclo.get_tipo_display() if hasattr(ciclo, "get_tipo_display") else ciclo.tipo
        assunto = f"Pesquisa de Satisfação: Como foi o atendimento? (Pedido {pedido.protocolo})"
        mensagem = (
            f"Olá {destinatario.first_name or destinatario.username},\n\n"
            f"Você concedeu o aceite para a execução técnica do Pedido {pedido.protocolo} ({tipo_nome}).\n"
            f"Sua opinião é fundamental para mantermos a qualidade do nosso atendimento!\n\n"
            f"Por favor, clique no botão abaixo para avaliar este ciclo (de 1 a 5 estrelas) e nos deixar um comentário."
        )
        url_destino = f"/magic-link/{magic_link.token}"
        cta_texto = "Avaliar Atendimento (Link Seguro)"
        
        # Cria a notificação In-App
        if enviar_in_app:
            Notification.objects.create(
                usuario=destinatario,
                titulo=f"Avalie o Atendimento: Pedido {pedido.protocolo}",
                mensagem=f"O ciclo de {tipo_nome} foi concluído. Clique aqui para avaliar o atendimento recebido e nos deixar um feedback.",
                url=f"/pedidos/{pedido.id}?ciclo={ciclo.id}",
                lida=False,
            )

        if enviar_email:
            NotificacaoService._enviar_email(
                destinatarios=[destinatario],
                assunto=assunto,
                mensagem_texto=mensagem,
                url_destino=url_destino,
                cta_texto=cta_texto,
            )

    @staticmethod
    def _enviar_email(destinatarios, assunto: str, mensagem_texto: str, url_destino: str = None, cta_texto: str = None, cc: list = None):
        """
        Dispara e-mail formatado em Plain-Text e HTML com link seguro (Magic Link), suportando destinatários (User ou string) e cópia (CC).
        """
        emails_destino = []
        for dest in (destinatarios or []):
            if isinstance(dest, str):
                if "@" in dest.strip():
                    emails_destino.append(dest.strip())
            elif hasattr(dest, "email") and dest.email and "@" in dest.email:
                emails_destino.append(dest.email.strip())

        emails_destino = list(dict.fromkeys(emails_destino))
        if not emails_destino:
            return

        emails_cc = []
        if cc:
            for item in cc:
                if isinstance(item, str) and "@" in item.strip():
                    emails_cc.append(item.strip())
                elif hasattr(item, "email") and item.email and "@" in item.email:
                    emails_cc.append(item.email.strip())
            emails_cc = [e for e in dict.fromkeys(emails_cc) if e not in emails_destino]

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        link_final = url_destino if (url_destino and url_destino.startswith("http")) else f"{frontend_url}{url_destino if url_destino else ''}"

        html_content = renderizar_email_transacional(
            assunto=assunto,
            mensagem_texto=mensagem_texto,
            link_final=link_final,
            cta_texto=cta_texto if url_destino else None,
        )

        try:
            msg = EmailMultiAlternatives(
                subject=f"[SHM] {assunto}",
                body=f"{mensagem_texto}\n\nAcessar link direto: {link_final}\n",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=emails_destino,
                cc=emails_cc if emails_cc else None,
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=True)
            logger.info("[EMAIL ENVIADO] %s para %s (CC: %s)", assunto, emails_destino, emails_cc)
        except Exception as e:
            logger.error("[EMAIL ERRO] Falha ao enviar para %s (CC: %s): %s", emails_destino, emails_cc, e, exc_info=True)

