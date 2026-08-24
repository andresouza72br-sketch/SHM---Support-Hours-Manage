from apps.notificacoes.models import Notification, TimelineEvent, TipoEventoTimeline
from apps.accounts.models import User, UserRole

class NotificacaoService:
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
        Notificações de ciclo de vida (orçamento, aprovação, execução, aceite)
        """
        if not ciclo or not ciclo.pedido:
            return

        pedido = ciclo.pedido
        url_destino = f"/pedidos/{pedido.id}"
        tipo_nome = ciclo.get_tipo_display() if hasattr(ciclo, "get_tipo_display") else ciclo.tipo

        destinatarios = []
        titulo = ""
        mensagem = ""

        if tipo_evento == "orcamento_apresentado":
            # Notifica cliente
            if pedido.cliente:
                destinatarios = list(User.objects.filter(cliente=pedido.cliente, is_active=True))
            titulo = f"Orçamento Apresentado: Ciclo #{ciclo.id} ({ciclo.horas_estimadas}h)"
            mensagem = f"A equipe técnica orçou o ciclo de {tipo_nome} em {ciclo.horas_estimadas}h para aprovação."

        elif tipo_evento == "orcamento_aprovado":
            # Notifica empresa
            empresa_users = User.objects.filter(
                role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO], is_active=True
            )
            destinatarios = list(empresa_users)
            titulo = f"Orçamento Aprovado: Ciclo #{ciclo.id} - {pedido.protocolo}"
            mensagem = f"O cliente aprovou o orçamento de {ciclo.horas_estimadas}h para o ciclo de {tipo_nome}."

        elif tipo_evento == "orcamento_rejeitado":
            empresa_users = User.objects.filter(
                role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO], is_active=True
            )
            destinatarios = list(empresa_users)
            titulo = f"Orçamento Rejeitado: Ciclo #{ciclo.id} - {pedido.protocolo}"
            mensagem = f"Orçamento rejeitado pelo cliente. Motivo: {justificativa}"

        elif tipo_evento == "aceite_solicitado":
            # Notifica cliente
            if pedido.cliente:
                destinatarios = list(User.objects.filter(cliente=pedido.cliente, is_active=True))
            titulo = f"Aceite Solicitado: Ciclo #{ciclo.id} ({ciclo.horas_realizadas}h)"
            mensagem = f"A execução técnica de {tipo_nome} foi finalizada ({ciclo.horas_realizadas}h) e o aceite foi solicitado."

        elif tipo_evento == "ciclo_aceito":
            # Notifica empresa
            empresa_users = User.objects.filter(
                role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO], is_active=True
            )
            destinatarios = list(empresa_users)
            titulo = f"Aceite Concedido: Ciclo #{ciclo.id} - {pedido.protocolo}"
            mensagem = f"O cliente concedeu aceite final ({ciclo.horas_realizadas}h debitadas do saldo)."

        elif tipo_evento == "aceite_recusado":
            empresa_users = User.objects.filter(
                role__in=[UserRole.EMPRESA_ADMIN, UserRole.EMPRESA_TECNICO], is_active=True
            )
            destinatarios = list(empresa_users)
            titulo = f"Aceite Recusado: Ciclo #{ciclo.id} - {pedido.protocolo}"
            mensagem = f"O cliente recusou o aceite do ciclo. Justificativa: {justificativa}"

        if destinatarios and titulo:
            notificacoes = [
                Notification(
                    usuario=dest,
                    titulo=titulo,
                    mensagem=mensagem,
                    url=url_destino,
                    lida=False,
                )
                for dest in destinatarios
                if not usuario_autor or dest.id != usuario_autor.id
            ]
            if notificacoes:
                Notification.objects.bulk_create(notificacoes)
