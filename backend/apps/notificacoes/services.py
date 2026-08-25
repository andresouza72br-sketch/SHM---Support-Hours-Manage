from apps.notificacoes.models import Notification, TimelineEvent, TipoEventoTimeline
from apps.accounts.models import User, UserRole

class NotificacaoService:
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
        autor_nome = (autor.get_full_name() or autor.username) if autor else "Usuário"
        origem = "Empresa" if (autor and autor.is_empresa) else (
            pedido.cliente.nome_fantasia if (pedido.cliente and pedido.cliente.nome_fantasia) else (
                pedido.cliente.razao_social if (pedido.cliente and pedido.cliente.razao_social) else "Cliente"
            )
        )
        url_destino = f"/pedidos/{pedido.id}"

        # 1. Registra evento na timeline
        try:
            TimelineEvent.objects.create(
                pedido=pedido,
                tipo=TipoEventoTimeline.PEDIDO_CRIADO,
                descricao=f"Pedido {pedido.protocolo} aberto por {autor_nome} ({origem})",
                autor=autor,
            )
        except Exception:
            pass

        # 2. Coleta destinatários
        destinatarios_set = set()

        # Usuários do cliente
        if pedido.cliente:
            cliente_users = User.objects.filter(cliente=pedido.cliente, is_active=True)
            for u in cliente_users:
                destinatarios_set.add(u)

        # Usuários da empresa
        empresa_users = User.objects.filter(
            role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO],
            is_active=True,
        )
        for u in empresa_users:
            destinatarios_set.add(u)

        # Remove o próprio autor
        if autor:
            destinatarios_set.discard(autor)

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
            NotificacaoService._enviar_email(
                destinatarios=destinatarios_set,
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
        autor_nome = autor.get_full_name() or autor.username

        # Resumo do texto do comentário (máximo 120 caracteres)
        texto_limpo = (comentario.texto or "").strip()
        texto_resumo = (texto_limpo[:117] + "...") if len(texto_limpo) > 120 else texto_limpo
        url_destino = f"/pedidos/{pedido.id}"

        destinatarios_set = set()

        # 1. Usuários do cliente vinculado
        if pedido.cliente:
            cliente_users = User.objects.filter(
                cliente=pedido.cliente,
                is_active=True,
            )
            for u in cliente_users:
                destinatarios_set.add(u)

        # 2. Usuários da empresa (Admins e Técnicos)
        empresa_users = User.objects.filter(
            role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO],
            is_active=True,
        )
        for u in empresa_users:
            destinatarios_set.add(u)

        # 3. Operador do ciclo (se houver)
        if ciclo.operador and ciclo.operador.is_active:
            destinatarios_set.add(ciclo.operador)

        # 4. Remove o próprio autor do comentário
        destinatarios_set.discard(autor)

        # Formatação de título e mensagem
        tipo_ciclo_nome = ciclo.get_tipo_display() if hasattr(ciclo, "get_tipo_display") else ciclo.tipo
        origem = "Empresa" if autor.is_empresa else (pedido.cliente.nome_fantasia if (pedido.cliente and pedido.cliente.nome_fantasia) else "Cliente")
        titulo = f"Novo Comentário: {pedido.protocolo} — {tipo_ciclo_nome}"
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
        url_destino = f"/pedidos/{pedido.id}"
        tipo_nome = ciclo.get_tipo_display() if hasattr(ciclo, "get_tipo_display") else ciclo.tipo

        autor = usuario_autor if (usuario_autor and hasattr(usuario_autor, "is_authenticated") and usuario_autor.is_authenticated) else None
        autor_nome = (autor.get_full_name() or autor.username) if autor else "Usuário"
        origem = "Empresa" if (autor and autor.is_empresa) else (
            pedido.cliente.nome_fantasia if (pedido.cliente and pedido.cliente.nome_fantasia) else (
                pedido.cliente.razao_social if (pedido.cliente and pedido.cliente.razao_social) else "Cliente"
            )
        )

        magic_link_path = f"/magic-link/{token_magic_link.token}" if token_magic_link else f"/pedidos/{pedido.id}"

        contrato = pedido.contrato
        contrato_num = contrato.numero if contrato else "Contrato Vinculado"
        cliente_nome = pedido.cliente.nome_fantasia if (pedido.cliente and pedido.cliente.nome_fantasia) else (
            pedido.cliente.razao_social if (pedido.cliente and pedido.cliente.razao_social) else "Cliente"
        )
        saldo_atual = f"{contrato.saldo:.1f}" if contrato else "0.0"

        titulo = ""
        mensagem = ""
        timeline_tipo = None
        timeline_desc = ""

        if tipo_evento == "orcamento_apresentado":
            titulo = f"Orçamento Apresentado: {pedido.protocolo} — {tipo_nome} ({ciclo.horas_estimadas:.1f}h)"
            url_destino = magic_link_path
            mensagem = (
                f"{autor_nome} ({origem}) apresentou o orçamento de {ciclo.horas_estimadas:.1f}h para {tipo_nome} no Pedido {pedido.protocolo} ({cliente_nome} / Contrato {contrato_num}).\n\n"
                f"• Link Seguro (Validade: 7 dias): Aprovar Orçamento\n"
                f"• AVISO: Caso deseje Não Aprovar / Recusar este orçamento, a operação deve ser realizada exclusivamente via app/plataforma com a respectiva justificativa."
            )
            timeline_tipo = TipoEventoTimeline.ORCAMENTO_APRESENTADO
            timeline_desc = f"Orçamento de {ciclo.horas_estimadas:.1f}h apresentado por {autor_nome} ({origem}) para o Contrato {contrato_num}"

        elif tipo_evento == "orcamento_aprovado":
            titulo = f"Orçamento Aprovado: {pedido.protocolo} — {tipo_nome} ({ciclo.horas_estimadas:.1f}h)"
            url_destino = f"/pedidos/{pedido.id}"
            mensagem = (
                f"{autor_nome} ({origem}) aprovou o orçamento de {ciclo.horas_estimadas:.1f}h para o Pedido {pedido.protocolo} ({cliente_nome} / Contrato {contrato_num}).\n\n"
                f"A equipe técnica da Empresa está autorizada a iniciar a execução das tarefas."
            )
            timeline_tipo = TipoEventoTimeline.ORCAMENTO_APROVADO
            timeline_desc = f"Orçamento de {ciclo.horas_estimadas:.1f}h aprovado por {autor_nome} ({origem}) no Contrato {contrato_num}"

        elif tipo_evento == "orcamento_rejeitado":
            titulo = f"Orçamento Rejeitado: {pedido.protocolo} — {tipo_nome}"
            url_destino = f"/pedidos/{pedido.id}"
            mensagem = f"{autor_nome} ({origem}) rejeitou o orçamento para o Pedido {pedido.protocolo}. Motivo: \"{justificativa}\""
            timeline_tipo = TipoEventoTimeline.ORCAMENTO_REJEITADO
            timeline_desc = f"Orçamento rejeitado por {autor_nome} ({origem}) no Contrato {contrato_num}. Motivo: {justificativa}"

        elif tipo_evento == "execucao_iniciada":
            titulo = f"Execução Iniciada: {pedido.protocolo} — {tipo_nome}"
            url_destino = f"/pedidos/{pedido.id}"
            mensagem = f"{autor_nome} ({origem}) iniciou a execução técnica do Pedido {pedido.protocolo} ({tipo_nome}) pelo Contrato {contrato_num} ({cliente_nome})."
            timeline_tipo = TipoEventoTimeline.EXECUCAO_INICIADA
            timeline_desc = f"Execução técnica de {tipo_nome} iniciada por {autor_nome} ({origem}) no Contrato {contrato_num}"

        elif tipo_evento == "aceite_solicitado":
            titulo = f"Aceite Solicitado: {pedido.protocolo} — {tipo_nome} ({ciclo.horas_realizadas:.1f}h)"
            url_destino = magic_link_path
            mensagem = (
                f"{autor_nome} ({origem}) finalizou a execução técnica ({ciclo.horas_realizadas:.1f}h) do Pedido {pedido.protocolo} e solicitou o aceite do cliente.\n\n"
                f"• Contrato: {contrato_num} ({cliente_nome})\n"
                f"• Link Seguro (Validade: 7 dias): Aceitar Entrega / De acordo em Debitar horas realizadas\n"
                f"• AVISO: Caso deseje Recusar o aceite, o processo deve ser realizado exclusivamente via app/plataforma informando a justificativa técnica obrigatória."
            )
            timeline_tipo = TipoEventoTimeline.ACEITE_SOLICITADO
            timeline_desc = f"Aceite solicitado por {autor_nome} ({origem}) com {ciclo.horas_realizadas:.1f}h realizadas no Contrato {contrato_num}"

        elif tipo_evento == "ciclo_aceito":
            titulo = f"Aceite Concedido & Saldo Debitado: {pedido.protocolo} — {tipo_nome}"
            url_destino = f"/pedidos/{pedido.id}"
            mensagem = (
                f"{autor_nome} ({origem}) concedeu o aceite final do Pedido {pedido.protocolo} ({tipo_nome}).\n\n"
                f"Foram debitadas {ciclo.horas_realizadas:.1f}h do Contrato {contrato_num} da empresa {cliente_nome}. Saldo remanescente: {saldo_atual}h."
            )
            timeline_tipo = TipoEventoTimeline.CICLO_ACEITO
            timeline_desc = f"Aceite final concedido por {autor_nome} ({origem}). Débito de {ciclo.horas_realizadas:.1f}h no Contrato {contrato_num} ({cliente_nome}). Saldo restante: {saldo_atual}h"

        elif tipo_evento == "aceite_recusado":
            titulo = f"Aceite Recusado: {pedido.protocolo} — {tipo_nome}"
            url_destino = f"/pedidos/{pedido.id}"
            mensagem = f"{autor_nome} ({origem}) recusou o aceite do Pedido {pedido.protocolo} ({tipo_nome}) no Contrato {contrato_num}. Justificativa: \"{justificativa}\""
            timeline_tipo = TipoEventoTimeline.ACEITE_RECUSADO
            timeline_desc = f"Aceite recusado por {autor_nome} ({origem}) no Contrato {contrato_num}. Justificativa: {justificativa}"

        # 1. Timeline Event com Auditoria Forense
        if timeline_tipo and timeline_desc:
            try:
                TimelineEvent.objects.create(
                    pedido=pedido,
                    ciclo=ciclo,
                    tipo=timeline_tipo,
                    descricao=timeline_desc,
                    autor=autor,
                    ip_origem=ip_origem,
                    user_agent=user_agent,
                )
            except Exception:
                pass

        # 2. Notificações para todos os envolvidos, exceto o autor
        destinatarios_set = set()

        # Todos os usuários do cliente
        if pedido.cliente:
            cliente_users = User.objects.filter(cliente=pedido.cliente, is_active=True)
            for u in cliente_users:
                destinatarios_set.add(u)

        # Todos os usuários da empresa (Admins e Técnicos)
        empresa_users = User.objects.filter(
            role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO],
            is_active=True,
        )
        for u in empresa_users:
            destinatarios_set.add(u)

        # Operador do ciclo
        if ciclo.operador and ciclo.operador.is_active:
            destinatarios_set.add(ciclo.operador)

        # Remove o autor da ação
        if autor:
            destinatarios_set.discard(autor)

        if destinatarios_set and titulo:
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

            # 3. Disparo de E-mail Real (SMTP / Console) com Magic Link e HTML
            # Regras de Governança:
            # - E-mails com Magic Link de aprovação/aceite: ESTRITAMENTE para o(s) Gerente(s) do Cliente (CLIENTE_GERENTE).
            # - E-mails de confirmação de aprovação de orçamento e aceite concedido: enviados para a equipe da Empresa (Gerente/Admin e Técnicos) e do Cliente.
            if tipo_evento in ["orcamento_apresentado", "aceite_solicitado"]:
                destinatarios_email = set(
                    User.objects.filter(
                        cliente=pedido.cliente,
                        role=UserRole.CLIENTE_GERENTE,
                        is_active=True,
                    )
                )
                if autor:
                    destinatarios_email.discard(autor)
            else:
                destinatarios_email = destinatarios_set

            cta_btn = None
            if tipo_evento == "orcamento_apresentado":
                cta_btn = f"Aprovar Orçamento ({ciclo.horas_estimadas:.1f}h)"
            elif tipo_evento == "orcamento_aprovado":
                cta_btn = "Iniciar Execução Técnica no SHM"
            elif tipo_evento == "aceite_solicitado":
                cta_btn = f"Aceitar Entrega / De acordo em Debitar ({ciclo.horas_realizadas:.1f}h)"
            elif tipo_evento == "ciclo_aceito":
                cta_btn = "Visualizar Pedido Concluído no SHM"
            else:
                cta_btn = "Visualizar no Portal SHM"

            if destinatarios_email:
                NotificacaoService._enviar_email(
                    destinatarios=destinatarios_email,
                    assunto=titulo,
                    mensagem_texto=mensagem,
                    url_destino=url_destino,
                    cta_texto=cta_btn,
                )

    @staticmethod
    def _enviar_email(destinatarios, assunto: str, mensagem_texto: str, url_destino: str = None, cta_texto: str = None):
        """
        Dispara e-mail formatado em Plain-Text e HTML com link seguro (Magic Link).
        """
        from django.conf import settings
        from django.core.mail import EmailMultiAlternatives

        emails_destino = [u.email for u in destinatarios if u.email and "@" in u.email]
        if not emails_destino:
            return

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        link_final = url_destino if (url_destino and url_destino.startswith("http")) else f"{frontend_url}{url_destino if url_destino else ''}"

        cta_html = ""
        if cta_texto and url_destino:
            cta_html = f"""
            <div style="margin: 28px 0; text-align: center;">
                <a href="{link_final}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                    {cta_texto} &rarr;
                </a>
            </div>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #334155; margin: 0; padding: 32px 16px; }}
                .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); }}
                .header {{ border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }}
                .brand {{ font-size: 16px; font-weight: 900; color: #4f46e5; letter-spacing: -0.5px; }}
                .title {{ font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 0; line-height: 1.3; }}
                .body-text {{ font-size: 13px; line-height: 1.7; color: #334155; white-space: pre-line; }}
                .footer {{ font-size: 11px; color: #94a3b8; margin-top: 32px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="header">
                    <span class="brand">⚡ SHM — Support Hours Manager</span>
                </div>
                <h2 class="title">{assunto}</h2>
                <div class="body-text">{mensagem_texto}</div>
                {cta_html}
                <div class="footer">
                    Este é um e-mail de notificação segura emitido automaticamente pela plataforma SHM.<br>
                    Validade do link de ação: 7 dias a partir da emissão.
                </div>
            </div>
        </body>
        </html>
        """

        try:
            msg = EmailMultiAlternatives(
                subject=f"[SHM] {assunto}",
                body=f"{mensagem_texto}\n\nAcessar link direto: {link_final}\n",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=emails_destino,
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=True)
            print(f"[EMAIL ENVIADO] {assunto} para {emails_destino}")
        except Exception as e:
            print(f"[EMAIL ERRO] Falha ao enviar para {emails_destino}: {e}")

