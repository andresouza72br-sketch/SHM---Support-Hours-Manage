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
        titulo = f"Novo Comentário: Ciclo #{ciclo.id} - {pedido.protocolo} ({tipo_ciclo_nome})"
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

    @staticmethod
    def notificar_evento_ciclo(ciclo, tipo_evento: str, usuario_autor=None, justificativa: str = ""):
        """
        Notificações de ciclo de vida (orçamento, aprovação, execução, aceite).
        Notifica TODOS os usuários do Cliente e da Empresa envolvidos, EXCETO o próprio autor da ação.
        Registra também o evento correspondente na Timeline.
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

        titulo = ""
        mensagem = ""
        timeline_tipo = None
        timeline_desc = ""

        if tipo_evento == "orcamento_apresentado":
            titulo = f"Orçamento Apresentado: Ciclo #{ciclo.id} - {pedido.protocolo} ({ciclo.horas_estimadas}h)"
            mensagem = f"{autor_nome} ({origem}) apresentou o orçamento de {ciclo.horas_estimadas}h para o ciclo de {tipo_nome}."
            timeline_tipo = TipoEventoTimeline.ORCAMENTO_APRESENTADO
            timeline_desc = f"Orçamento de {ciclo.horas_estimadas}h apresentado por {autor_nome} ({origem})"

        elif tipo_evento == "orcamento_aprovado":
            titulo = f"Orçamento Aprovado: Ciclo #{ciclo.id} - {pedido.protocolo}"
            mensagem = f"{autor_nome} ({origem}) aprovou o orçamento de {ciclo.horas_estimadas}h para o ciclo de {tipo_nome}."
            timeline_tipo = TipoEventoTimeline.ORCAMENTO_APROVADO
            timeline_desc = f"Orçamento de {ciclo.horas_estimadas}h aprovado por {autor_nome} ({origem})"

        elif tipo_evento == "orcamento_rejeitado":
            titulo = f"Orçamento Rejeitado: Ciclo #{ciclo.id} - {pedido.protocolo}"
            mensagem = f"{autor_nome} ({origem}) rejeitou o orçamento do ciclo de {tipo_nome}. Motivo: \"{justificativa}\""
            timeline_tipo = TipoEventoTimeline.ORCAMENTO_REJEITADO
            timeline_desc = f"Orçamento rejeitado por {autor_nome} ({origem}). Motivo: {justificativa}"

        elif tipo_evento == "execucao_iniciada":
            titulo = f"Execução Iniciada: Ciclo #{ciclo.id} - {pedido.protocolo}"
            mensagem = f"{autor_nome} ({origem}) iniciou a execução técnica do ciclo de {tipo_nome}."
            timeline_tipo = TipoEventoTimeline.EXECUCAO_INICIADA
            timeline_desc = f"Execução técnica iniciada por {autor_nome} ({origem})"

        elif tipo_evento == "aceite_solicitado":
            titulo = f"Aceite Solicitado: Ciclo #{ciclo.id} - {pedido.protocolo} ({ciclo.horas_realizadas}h)"
            mensagem = f"{autor_nome} ({origem}) finalizou a execução técnica ({ciclo.horas_realizadas}h) e solicitou o aceite do cliente."
            timeline_tipo = TipoEventoTimeline.ACEITE_SOLICITADO
            timeline_desc = f"Aceite solicitado por {autor_nome} ({origem}) com {ciclo.horas_realizadas}h realizadas"

        elif tipo_evento == "ciclo_aceito":
            titulo = f"Aceite Concedido: Ciclo #{ciclo.id} - {pedido.protocolo}"
            mensagem = f"{autor_nome} ({origem}) concedeu o aceite final ({ciclo.horas_realizadas}h debitadas do saldo)."
            timeline_tipo = TipoEventoTimeline.CICLO_ACEITO
            timeline_desc = f"Aceite final concedido por {autor_nome} ({origem}) ({ciclo.horas_realizadas}h debitadas)"

        elif tipo_evento == "aceite_recusado":
            titulo = f"Aceite Recusado: Ciclo #{ciclo.id} - {pedido.protocolo}"
            mensagem = f"{autor_nome} ({origem}) recusou o aceite do ciclo de {tipo_nome}. Justificativa: \"{justificativa}\""
            timeline_tipo = TipoEventoTimeline.ACEITE_RECUSADO
            timeline_desc = f"Aceite recusado por {autor_nome} ({origem}). Justificativa: {justificativa}"

        # 1. Timeline Event
        if timeline_tipo and timeline_desc:
            try:
                TimelineEvent.objects.create(
                    pedido=pedido,
                    ciclo=ciclo,
                    tipo=timeline_tipo,
                    descricao=timeline_desc,
                    autor=autor,
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
