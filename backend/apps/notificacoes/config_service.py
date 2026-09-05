import logging
from apps.accounts.models import User, UserRole
from apps.notificacoes.models import ConfiguracaoNotificacao, CategoriaNotificacao

logger = logging.getLogger(__name__)

CONFIGURACOES_PADRAO = [
    # --- AUTENTICACAO ---
    {
        "codigo": "AUTH_MAGIC_LOGIN",
        "categoria": CategoriaNotificacao.AUTENTICACAO,
        "nome": "Link de Acesso Seguro (Magic Login)",
        "descricao": "Disparado quando um usuário solicita login sem senha via e-mail.",
        "ativo_email": True,
        "ativo_in_app": False,
        "notificar_empresa_admin": False,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": False,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": False,
        "bloqueado_edicao": True,
    },
    # --- CLIENTES ---
    {
        "codigo": "CLIENTE_CONVITE_USUARIO",
        "categoria": CategoriaNotificacao.CLIENTES,
        "nome": "Convite de Acesso para Novo Usuário",
        "descricao": "Disparado ao cadastrar um novo usuário de cliente na plataforma.",
        "ativo_email": True,
        "ativo_in_app": False,
        "notificar_empresa_admin": False,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": False,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "CLIENTE_APROVACAO_CADASTRO",
        "categoria": CategoriaNotificacao.CLIENTES,
        "nome": "Aprovação de Cadastro de Cliente",
        "descricao": "Disparado quando um cliente é pré-cadastrado e precisa aprovar os dados cadastrais (Magic Link de 7 dias).",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "CLIENTE_CADASTRO_CONFIRMADO",
        "categoria": CategoriaNotificacao.CLIENTES,
        "nome": "Confirmação de Cadastro de Cliente (Homologação Concluída)",
        "descricao": "Disparado quando o gestor do cliente conclui a aprovação cadastral e validação de e-mail via Magic Link.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": False,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    # --- CONTRATOS ---
    {
        "codigo": "CONTRATO_CONVITE_CONFIRMACAO",
        "categoria": CategoriaNotificacao.CONTRATOS,
        "nome": "Confirmação de E-mail de Notificação de Contrato",
        "descricao": "Disparado para e-mails cadastrados na lista de acompanhamento do contrato (Magic Link de 15 dias).",
        "ativo_email": True,
        "ativo_in_app": False,
        "notificar_empresa_admin": False,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": False,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "CONTRATO_ACEITE_SOLICITADO",
        "categoria": CategoriaNotificacao.CONTRATOS,
        "nome": "Aceite de Contrato & Início dos Trabalhos",
        "descricao": "Disparado formalmente para o gestor responsável autorizar o início dos serviços (Magic Link de 30 dias).",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": False,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "CONTRATO_ATIVADO",
        "categoria": CategoriaNotificacao.CONTRATOS,
        "nome": "Contrato Ativado / Início Autorizado",
        "descricao": "Disparado quando o aceite eletrônico do contrato é formalizado com sucesso.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "CONTRATO_MIGRACAO_SALDO",
        "categoria": CategoriaNotificacao.CONTRATOS,
        "nome": "Aproveitamento e Migração de Saldo",
        "descricao": "Disparado quando horas de um contrato vencido/encerrado são transferidas para um contrato vigente.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "CONTRATO_COMPENSACAO_DEBITO",
        "categoria": CategoriaNotificacao.CONTRATOS,
        "nome": "Compensação e Quitação de Débito",
        "descricao": "Disparado quando horas de um novo contrato abatem saldo devedor do contrato anterior.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "CONTRATO_EXPIRACAO_PROXIMA",
        "categoria": CategoriaNotificacao.CONTRATOS,
        "nome": "Aviso de Proximidade do Término de Vigência",
        "descricao": "Disparado com antecedência antes da data de término do contrato de suporte.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    # --- SALDO ---
    {
        "codigo": "SALDO_ALERTA_80_PORCENTO",
        "categoria": CategoriaNotificacao.SALDO,
        "nome": "Alerta de 80% da Franquia Consumida",
        "descricao": "Disparado automaticamente quando o saldo restante atinge 20% ou menos da franquia contratada.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "SALDO_ESGOTADO_OU_NEGATIVO",
        "categoria": CategoriaNotificacao.SALDO,
        "nome": "Alerta de Saldo Esgotado / Limite Crítico",
        "descricao": "Disparado quando o saldo do contrato chega a 0.0h ou entra em saldo devedor/negativo.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    # --- PEDIDOS ---
    {
        "codigo": "PEDIDO_CRIADO",
        "categoria": CategoriaNotificacao.PEDIDOS,
        "nome": "Novo Chamado / Pedido Aberto",
        "descricao": "Disparado na criação de um novo chamado no portal.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": True,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "COMENTARIO_CRIADO",
        "categoria": CategoriaNotificacao.PEDIDOS,
        "nome": "Novo Comentário ou Mensagem Técnica",
        "descricao": "Disparado quando qualquer comentário ou instrução é postada em um ciclo/tarefa.",
        "ativo_email": False,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": True,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    # --- CICLOS ---
    {
        "codigo": "ORCAMENTO_APRESENTADO",
        "categoria": CategoriaNotificacao.CICLOS,
        "nome": "Orçamento Apresentado para Aprovação",
        "descricao": "Disparado quando a equipe técnica envia a estimativa de horas para autorização do cliente (Magic Link de 7 dias).",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": True,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "ORCAMENTO_APROVADO",
        "categoria": CategoriaNotificacao.CICLOS,
        "nome": "Orçamento Aprovado pelo Cliente",
        "descricao": "Disparado quando o cliente aprova as horas estimadas, autorizando a execução técnica.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": True,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "ORCAMENTO_REJEITADO",
        "categoria": CategoriaNotificacao.CICLOS,
        "nome": "Orçamento Rejeitado pelo Cliente",
        "descricao": "Disparado quando o cliente recusa a estimativa com justificativa.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": True,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "EXECUCAO_INICIADA",
        "categoria": CategoriaNotificacao.CICLOS,
        "nome": "Execução Técnica Iniciada",
        "descricao": "Disparado quando o operador técnico inicia o atendimento prático da demanda.",
        "ativo_email": False,
        "ativo_in_app": True,
        "notificar_empresa_admin": False,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": True,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "ACEITE_SOLICITADO",
        "categoria": CategoriaNotificacao.CICLOS,
        "nome": "Aceite da Entrega Técnica Solicitado",
        "descricao": "Disparado quando a equipe finaliza as tarefas e solicita o aceite e débito de horas (Magic Link de 7 dias).",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": True,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "CICLO_ACEITO",
        "categoria": CategoriaNotificacao.CICLOS,
        "nome": "Aceite Concedido e Horas Debitadas",
        "descricao": "Disparado após o aceite formal do cliente, confirmando a entrega e o débito no saldo.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": True,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "ACEITE_RECUSADO",
        "categoria": CategoriaNotificacao.CICLOS,
        "nome": "Aceite Recusado pelo Cliente",
        "descricao": "Disparado quando a entrega técnica é recusada com justificativa obrigatória.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": True,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "AVALIACAO_ATENDIMENTO",
        "categoria": CategoriaNotificacao.CICLOS,
        "nome": "Pesquisa de Satisfação (Avaliação do Atendimento)",
        "descricao": "Disparado para o cliente avaliar o atendimento recebido (1 a 5 estrelas) após o aceite.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": False,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": True,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "SALDO_REABASTECIMENTO",
        "categoria": CategoriaNotificacao.SALDO,
        "nome": "Reabastecimento Manual de Saldo de Horas",
        "descricao": "Disparado quando horas são adicionadas manualmente ao contrato pela empresa prestadora.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "SALDO_MIGRACAO",
        "categoria": CategoriaNotificacao.SALDO,
        "nome": "Migração e Transferência de Saldo entre Contratos",
        "descricao": "Disparado quando saldo remanescente é transferido de um contrato expirado para um contrato ativo.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "SALDO_COMPENSACAO",
        "categoria": CategoriaNotificacao.SALDO,
        "nome": "Compensação de Saldo Negativo Excedente",
        "descricao": "Disparado quando horas excedentes são compensadas formalmente no faturamento ou novo aporte.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "CONTRATO_EXPIRADO",
        "categoria": CategoriaNotificacao.CONTRATOS,
        "nome": "Contrato Expirado por Término de Vigência",
        "descricao": "Disparado automaticamente na data final de vigência do contrato.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": True,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "CONTRATO_DOCUMENTO_EXCLUSAO",
        "categoria": CategoriaNotificacao.CONTRATOS,
        "nome": "Exclusão de Documento Contratual",
        "descricao": "Disparado quando um documento ou termo aditivo anexado ao contrato é excluído.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": False,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "CLIENTE_EXCLUSAO",
        "categoria": CategoriaNotificacao.CLIENTES,
        "nome": "Exclusão Definitiva de Cliente (LGPD)",
        "descricao": "Disparado quando um cadastro de cliente tomador é excluído definitivamente com justificativa.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": False,
        "notificar_cliente_gerente": False,
        "notificar_cliente_comum": False,
        "notificar_gestor_contrato": False,
        "notificar_emails_cc": False,
        "nao_enviar_autor": False,
        "bloqueado_edicao": False,
    },
    {
        "codigo": "PEDIDO_CANCELAMENTO",
        "categoria": CategoriaNotificacao.PEDIDOS,
        "nome": "Cancelamento de Pedido de Suporte",
        "descricao": "Disparado no cancelamento formal de um chamado / pedido com justificativa.",
        "ativo_email": True,
        "ativo_in_app": True,
        "notificar_empresa_admin": True,
        "notificar_empresa_tecnico": True,
        "notificar_cliente_gerente": True,
        "notificar_cliente_comum": True,
        "notificar_gestor_contrato": True,
        "notificar_emails_cc": False,
        "nao_enviar_autor": True,
        "bloqueado_edicao": False,
    },
]


class NotificacaoConfigService:
    @staticmethod
    def garantir_configuracoes_padrao():
        """
        Garante idempotentemente que todas as configurações padrão existam no banco de dados.
        Sincroniza o campo nao_enviar_autor caso o registro já exista.
        """
        for item in CONFIGURACOES_PADRAO:
            cfg, created = ConfiguracaoNotificacao.objects.get_or_create(
                codigo=item["codigo"],
                defaults=item,
            )
            if not created and "nao_enviar_autor" in item:
                if cfg.nao_enviar_autor != item["nao_enviar_autor"]:
                    cfg.nao_enviar_autor = item["nao_enviar_autor"]
                    cfg.save(update_fields=["nao_enviar_autor"])

    @staticmethod
    def obter_configuracao(codigo: str) -> ConfiguracaoNotificacao | None:
        """
        Obtém a configuração do evento ou cria com os padrões se inexistente.
        """
        try:
            return ConfiguracaoNotificacao.objects.get(codigo=codigo)
        except ConfiguracaoNotificacao.DoesNotExist:
            padrao = next((c for c in CONFIGURACOES_PADRAO if c["codigo"] == codigo), None)
            if padrao:
                return ConfiguracaoNotificacao.objects.create(**padrao)
            return None

    @staticmethod
    def resolver_destinatarios_evento(
        codigo: str,
        pedido=None,
        ciclo=None,
        contrato=None,
        cliente=None,
        autor=None,
    ) -> tuple[bool, bool, set[User], list[str]]:
        """
        Resolve se envia e-mail, se envia in-app, quais usuários recebem (Users) e quais e-mails adicionais/CC (strings).
        Retorna: (enviar_email, enviar_in_app, usuarios_destinatarios, emails_cc)
        """
        cfg = NotificacaoConfigService.obter_configuracao(codigo)
        if not cfg:
            # Se não houver configuração, mantém comportamento ativo por padrão
            return True, True, set(), []

        enviar_email = cfg.ativo_email
        enviar_in_app = cfg.ativo_in_app

        if not enviar_email and not enviar_in_app:
            return False, False, set(), []

        # Determinar entidades de contexto
        contrato_obj = contrato or (pedido.contrato if pedido else (ciclo.pedido.contrato if (ciclo and ciclo.pedido) else None))
        cliente_obj = cliente or (contrato_obj.cliente if contrato_obj else (pedido.cliente if pedido else (ciclo.pedido.cliente if (ciclo and ciclo.pedido) else None)))

        destinatarios_usuarios = set()

        # 1. Admins da Empresa
        if cfg.notificar_empresa_admin:
            destinatarios_usuarios.update(User.objects.filter(role=UserRole.EMPRESA_ADMIN, is_active=True))

        # 2. Técnicos da Empresa
        if cfg.notificar_empresa_tecnico:
            destinatarios_usuarios.update(User.objects.filter(role=UserRole.EMPRESA_TECNICO, is_active=True))

        # 3. Gerentes do Cliente
        if cfg.notificar_cliente_gerente and cliente_obj:
            destinatarios_usuarios.update(User.objects.filter(cliente=cliente_obj, role=UserRole.CLIENTE_GERENTE, is_active=True))

        # 4. Solicitantes Comuns do Cliente (Analistas)
        if cfg.notificar_cliente_comum and cliente_obj:
            destinatarios_usuarios.update(User.objects.filter(cliente=cliente_obj, role=UserRole.CLIENTE_ANALISTA, is_active=True))

        # Se operador do ciclo estiver ativo, adiciona
        if ciclo and ciclo.operador and ciclo.operador.is_active:
            destinatarios_usuarios.add(ciclo.operador)

        # Regra de envio para o autor da ação:
        # Se nao_enviar_autor for True (padrão em eventos operacionais), remove o autor dos destinatários
        nao_enviar_autor = getattr(cfg, "nao_enviar_autor", True)
        if nao_enviar_autor and autor and hasattr(autor, "is_authenticated") and autor.is_authenticated:
            destinatarios_usuarios.discard(autor)

        # 5. Destinatários de E-mails / CC
        emails_cc = []
        if cfg.notificar_gestor_contrato and contrato_obj:
            if contrato_obj.gestor_email and "@" in contrato_obj.gestor_email:
                emails_cc.append(contrato_obj.gestor_email.strip())

        if cfg.notificar_emails_cc:
            if contrato_obj and contrato_obj.emails_notificacao and isinstance(contrato_obj.emails_notificacao, list):
                for it in contrato_obj.emails_notificacao:
                    if isinstance(it, dict) and it.get("ativo", True):
                        em = it.get("email")
                        if em and "@" in str(em):
                            emails_cc.append(str(em).strip())
                    elif isinstance(it, str) and "@" in it:
                        emails_cc.append(it.strip())

            if cliente_obj and hasattr(cliente_obj, "emails_notificacao_padrao"):
                from apps.notificacoes.services import NotificacaoService
                emails_cc.extend(NotificacaoService._extrair_emails_lista(cliente_obj.emails_notificacao_padrao))

        if cfg.emails_adicionais and isinstance(cfg.emails_adicionais, list):
            for ad in cfg.emails_adicionais:
                if isinstance(ad, str) and "@" in ad:
                    emails_cc.append(ad.strip())

        # Remover duplicados e e-mails já atendidos por usuários
        emails_dos_usuarios = {u.email.lower().strip() for u in destinatarios_usuarios if u.email}
        emails_cc_filtrados = [
            e for e in dict.fromkeys(emails_cc)
            if e.lower().strip() not in emails_dos_usuarios
        ]

        # Se nao_enviar_autor for True, garante que o e-mail do autor não seja incluído na lista CC
        if nao_enviar_autor and autor and hasattr(autor, "email") and autor.email:
            autor_email_norm = autor.email.lower().strip()
            emails_cc_filtrados = [
                e for e in emails_cc_filtrados
                if e.lower().strip() != autor_email_norm
            ]

        return enviar_email, enviar_in_app, destinatarios_usuarios, emails_cc_filtrados
