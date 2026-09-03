import logging
from datetime import timedelta
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone
from apps.accounts.models import User, PasswordlessLoginToken

logger = logging.getLogger(__name__)

class ClienteUsuarioEmailService:
    @staticmethod
    def gerar_corpo_email_convite(user: User, token_obj: PasswordlessLoginToken, convidador: User = None) -> tuple[str, str]:
        cliente = user.cliente
        convidador_nome = (convidador.get_full_name() or convidador.username) if convidador else "Administrador da Plataforma"
        convidador_papel = convidador.get_role_display() if convidador else "Gestão SHM"

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        link_acesso = f"{frontend_url}/magic-link/{token_obj.token}"
        data_limite = token_obj.expira_em.strftime("%d/%m/%Y às %H:%M")
        nome_cliente = cliente.display_name if cliente else "Sua Empresa"
        nome_usuario = user.first_name or user.username
        papel_usuario = user.get_role_display()

        texto_plano = f"""
Olá, {nome_usuario}!

Você foi cadastrado por {convidador_nome} ({convidador_papel}) com o perfil de "{papel_usuario}" para acessar o Portal de Suporte SHM em nome da empresa {nome_cliente}.

COMO ACESSAR O PORTAL:
1. 🔑 Clique no botão ou link de acesso seguro abaixo (não é necessário digitar senha no primeiro login).
2. 🚀 Ao entrar, você poderá acompanhar chamados, abrir novos pedidos, interagir em comentários e {'aprovar orçamentos/aceites' if user.can_approve_cycles else 'acompanhar demandas'}.
3. 🌐 Você também pode utilizar o botão "Entrar com Google" se sua conta for vinculada ao Google Workspace.

LINK DE ACESSO IMEDIATO:
{link_acesso}

⚠️ Este link possui validade de 48 horas (expira em {data_limite}).

Atenciosamente,
Equipe SHM — Support Hours Manager
        """.strip()

        html = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite de Acesso ao Portal SHM</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Portal de Suporte SHM</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #e0e7ff; font-weight: 500;">Convite de Acesso Corporativo</p>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 32px 24px;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Olá, {nome_usuario}!</h2>
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
          Você foi cadastrado por <strong>{convidador_nome}</strong> com o perfil <strong>{papel_usuario}</strong> para acessar o sistema SHM vinculado à empresa <strong>{nome_cliente}</strong>.
        </p>

        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">Seus Privilégios de Acesso</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
            <li>Abertura e acompanhamento de chamados técnicos em tempo real</li>
            <li>Comunicação direta com o time de engenharia em cada tarefa</li>
            {'<li><strong>Aprovação de orçamentos e formalização de aceites de entrega</strong></li>' if user.can_approve_cycles else ''}
          </ul>
        </div>

        <div style="text-align: center; margin: 32px 0 24px 0;">
          <a href="{link_acesso}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
            Acessar o Portal SHM
          </a>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center; margin: 16px 0 0 0;">
          ⏳ <strong>Validade do Link:</strong> 48 horas (expira em {data_limite}).<br>
          Após o primeiro acesso, você também poderá utilizar o botão <em>"Entrar com Google"</em>.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
        SHM — Support Hours Manager • Este é um e-mail automático do sistema.
      </td>
    </tr>
  </table>
</body>
</html>
        """.strip()

        return texto_plano, html

    @staticmethod
    def enviar_convite_usuario(user: User, token_obj: PasswordlessLoginToken, convidador: User = None) -> bool:
        from apps.notificacoes.config_service import NotificacaoConfigService
        cfg = NotificacaoConfigService.obter_configuracao("CLIENTE_CONVITE_USUARIO")
        if cfg and not cfg.ativo_email:
            logger.info("Envio de e-mail de convite de usuário desativado por configuração do administrador.")
            return True

        try:
            texto_plano, html = ClienteUsuarioEmailService.gerar_corpo_email_convite(user, token_obj, convidador)
            cliente_nome = user.cliente.display_name if user.cliente else "SHM"
            assunto = f"Convite de Acesso ao Portal SHM — {cliente_nome}"
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "SHM Suporte <noreply@tellin.com.br>")

            msg = EmailMultiAlternatives(
                subject=assunto,
                body=texto_plano,
                from_email=from_email,
                to=[user.email],
            )
            msg.attach_alternative(html, "text/html")
            msg.send(fail_silently=False)
            logger.info(f"Convite de acesso enviado com sucesso para {user.email}")
            return True
        except Exception as e:
            logger.error(f"Erro ao disparar e-mail de convite para {user.email}: {e}")
            return False

    @staticmethod
    def gerar_corpo_email_aprovacao_cliente(cliente, aceite_link, request=None) -> tuple[str, str]:
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        link_aprovacao = f"{frontend_url}/aceite-cliente/{aceite_link.token}"
        data_limite = aceite_link.data_expiracao.strftime("%d/%m/%Y às %H:%M")
        
        nome_gestor = cliente.pessoa_contato or (cliente.nome_completo if cliente.tipo == "PF" else "Gestor Responsável")
        doc_identificador = f"CNPJ: {cliente.cnpj}" if cliente.tipo == "PJ" and cliente.cnpj else f"CPF: {cliente.cpf}" if cliente.cpf else ""
        razao_ou_nome = cliente.razao_social if cliente.tipo == "PJ" else cliente.nome_completo

        texto_plano = f"""
Olá, {nome_gestor}!

Um novo cadastro em nome de "{cliente.display_name}" ({doc_identificador}) foi registrado no Portal SHM — Support Hours Manager.

Para concluir a ativação da sua organização e autorizar o recebimento de notificações operacionais, é necessário revisar e confirmar as informações cadastrais através do link seguro de aprovação.

DADOS DO CADASTRO:
• Empresa / Titular: {razao_ou_nome}
• Documento: {doc_identificador}
• E-mail de Contato: {cliente.email_contato}
• Responsável / Ponto Focal: {nome_gestor} {f'- {cliente.cargo_contato}' if cliente.cargo_contato else ''}

LINK SEGURO DE REVISÃO E APROVAÇÃO (VÁLIDO POR 7 DIAS):
{link_aprovacao}

⚠️ Ao acessar o link acima, você poderá conferir todos os dados cadastrais, aceitar os termos institucionais e, em um único clique, validar o seu endereço de e-mail e ativar a conta.

Este link expira em {data_limite} (prazo de 7 dias corridos).

Atenciosamente,
Equipe SHM — Support Hours Manager
        """.strip()

        html = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aprovação de Cadastro — {cliente.display_name}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Portal SHM — Governança</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #e0e7ff; font-weight: 500;">Aprovação Cadastral & Validação de E-mail</p>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 32px 24px;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Olá, {nome_gestor}!</h2>
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
          Foi realizado o pré-cadastro da organização <strong>{cliente.display_name}</strong> no sistema de gestão de franquias e suporte técnico <strong>SHM</strong>.
        </p>

        <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Resumo dos Dados Cadastrados</h3>
          <table width="100%" style="font-size: 13px; color: #334155; line-height: 1.6;">
            <tr>
              <td style="padding: 4px 0; font-weight: 600; width: 140px; color: #64748b;">Razão / Titular:</td>
              <td style="padding: 4px 0; font-weight: 700;">{razao_ou_nome}</td>
            </tr>
            {f'<tr><td style="padding: 4px 0; font-weight: 600; color: #64748b;">Documento:</td><td style="padding: 4px 0; font-mono;">{doc_identificador}</td></tr>' if doc_identificador else ''}
            <tr>
              <td style="padding: 4px 0; font-weight: 600; color: #64748b;">Gestor Indicado:</td>
              <td style="padding: 4px 0;">{nome_gestor} {f'({cliente.cargo_contato})' if cliente.cargo_contato else ''}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 600; color: #64748b;">E-mail de Contato:</td>
              <td style="padding: 4px 0; font-weight: 600; color: #4f46e5;">{cliente.email_contato}</td>
            </tr>
          </table>
        </div>

        <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #475569;">
          Para ativar o cadastro da organização, conferir os dados completos (endereço, contatos e preferências fiscais) e verificar seu e-mail de forma automática, utilize o botão seguro abaixo:
        </p>

        <div style="text-align: center; margin: 32px 0 24px 0;">
          <a href="{link_aprovacao}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
            Revisar Dados & Aprovar Cadastro
          </a>
        </div>

        <div style="background-color: #f1f5f9; border-radius: 10px; padding: 12px; margin-top: 20px; font-size: 12px; color: #475569; border-left: 4px solid #4f46e5;">
          ⏳ <strong>Validade do Link:</strong> Este Magic Link é válido por <strong>7 dias</strong> (expira em {data_limite}). Ao formalizar o aceite, o e-mail será confirmado automaticamente.
        </div>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
        SHM — Support Hours Manager • Gestão de Contratos de Suporte & Franquia de Horas
      </td>
    </tr>
  </table>
</body>
</html>
        """.strip()

        return texto_plano, html

    @staticmethod
    def enviar_email_aprovacao_cliente(cliente, aceite_link, request=None) -> bool:
        from apps.notificacoes.config_service import NotificacaoConfigService
        cfg = NotificacaoConfigService.obter_configuracao("CLIENTE_APROVACAO_CADASTRO")
        if cfg and not cfg.ativo_email:
            logger.info("Envio de e-mail de aprovação de cadastro desativado por configuração do administrador.")
            return True

        destinatario = cliente.email_contato
        if not destinatario or not str(destinatario).strip():
            logger.warning(f"Cliente #{cliente.id} não possui email_contato cadastrado para envio de aceite.")
            return False

        try:
            texto_plano, html = ClienteUsuarioEmailService.gerar_corpo_email_aprovacao_cliente(
                cliente=cliente,
                aceite_link=aceite_link,
                request=request,
            )
            assunto = f"Aprovação de Cadastro — {cliente.display_name} | Portal SHM"
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "SHM Suporte <noreply@tellin.com.br>")

            msg = EmailMultiAlternatives(
                subject=assunto,
                body=texto_plano,
                from_email=from_email,
                to=[destinatario.strip()],
            )
            msg.attach_alternative(html, "text/html")
            msg.send(fail_silently=False)
            logger.info(f"Link de aprovação (7 dias) enviado com sucesso para {destinatario} do cliente #{cliente.id}")
            return True
        except Exception as e:
            logger.error(f"Erro ao disparar e-mail de aprovação de cliente para {destinatario}: {e}")
            return False

