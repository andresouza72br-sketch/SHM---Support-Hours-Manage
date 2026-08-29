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

        # 2. Coleta destinatários
        destinatarios_set = NotificacaoService._obter_destinatarios_envolvidos(pedido, autor=autor)

        # Formata título e mensagem
        contrato_info = f" (Contrato {pedido.contrato.numero})" if pedido.contrato else ""
        titulo = f"Novo Pedido: {pedido.protocolo} - {pedido.assunto}"
        desc_resumo = (pedido.descricao[:100] + "...") if len(pedido.descricao) > 100 else pedido.descricao
        mensagem = f"{autor_nome} ({origem}) abriu um novo pedido{contrato_info}: \"{desc_resumo}\""

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

        if destinatarios_set:
            # Se pedido aberto pelo cliente, notifica a equipe da empresa para triagem técnica
            if autor and not autor.is_empresa:
                destinatarios_email = set(User.objects.filter(
                    role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO],
                    is_active=True,
                ))
            else:
                destinatarios_email = set(User.objects.filter(cliente=pedido.cliente, is_active=True)) if pedido.cliente else set()
            if autor:
                destinatarios_email.discard(autor)

            if destinatarios_email:
                NotificacaoService._enviar_email(
                    destinatarios=destinatarios_email,
                    assunto=titulo,
                    mensagem_texto=mensagem,
                    url_destino=url_destino,
                    cta_texto="Visualizar Pedido no SHM",
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

        destinatarios_set = NotificacaoService._obter_destinatarios_envolvidos(pedido, ciclo=ciclo, autor=autor)

        # Formatação de título e mensagem
        tipo_ciclo_nome = ciclo.get_tipo_display() if hasattr(ciclo, "get_tipo_display") else ciclo.tipo
        titulo = f"Novo Comentário: {pedido.protocolo} - {tipo_ciclo_nome}"
        mensagem = f"{autor_nome} ({origem}): \"{texto_resumo}\""

        # Cria as notificações no banco em lote
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

        if destinatarios_set:
            NotificacaoService._enviar_email(
                destinatarios=destinatarios_set,
                assunto=titulo,
                mensagem_texto=mensagem,
                url_destino=url_destino,
                cta_texto="Ver Comentário no SHM",
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
        destinatarios_set = NotificacaoService._obter_destinatarios_envolvidos(pedido, ciclo=ciclo, autor=autor)

        if destinatarios_set and payload.get("titulo"):
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
            email_grupo = payload.get("email_grupo")
            if email_grupo:
                destinatarios_email = NotificacaoService._obter_destinatarios_email_por_grupo(
                    grupo=email_grupo,
                    pedido=pedido,
                    ciclo=ciclo,
                    autor=autor,
                )
                if destinatarios_email:
                    NotificacaoService._enviar_email(
                        destinatarios=destinatarios_email,
                        assunto=payload["titulo"],
                        mensagem_texto=payload["mensagem"],
                        url_destino=payload["url_destino"],
                        cta_texto=payload["cta_btn"],
                    )

    @staticmethod
    def enviar_email_avaliacao(ciclo, destinatario, magic_link):
        """
        Envia o e-mail de pesquisa de satisfação para o cliente que deu o aceite.
        """
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
        Notification.objects.create(
            usuario=destinatario,
            titulo=f"Avalie o Atendimento: Pedido {pedido.protocolo}",
            mensagem=f"O ciclo de {tipo_nome} foi concluído. Clique aqui para avaliar o atendimento recebido e nos deixar um feedback.",
            url=f"/pedidos/{pedido.id}?ciclo={ciclo.id}",
            lida=False,
        )

        NotificacaoService._enviar_email(
            destinatarios=[destinatario],
            assunto=assunto,
            mensagem_texto=mensagem,
            url_destino=url_destino,
            cta_texto=cta_texto,
        )

    @staticmethod
    def _enviar_email(destinatarios, assunto: str, mensagem_texto: str, url_destino: str = None, cta_texto: str = None):
        """
        Dispara e-mail formatado em Plain-Text e HTML com link seguro (Magic Link).
        """
        emails_destino = [u.email for u in destinatarios if u.email and "@" in u.email]
        if not emails_destino:
            return

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
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=True)
            logger.info("[EMAIL ENVIADO] %s para %s", assunto, emails_destino)
        except Exception as e:
            logger.error("[EMAIL ERRO] Falha ao enviar para %s: %s", emails_destino, e, exc_info=True)

