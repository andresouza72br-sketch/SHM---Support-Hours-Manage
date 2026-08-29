"""
Templates e renderizadores HTML para notificações transacionais do SHM.
"""

def renderizar_email_transacional(assunto: str, mensagem_texto: str, link_final: str = None, cta_texto: str = None) -> str:
    """
    Renderiza o layout HTML responsivo e com identidade visual do SHM para e-mails transacionais.
    """
    cta_html = ""
    if cta_texto and link_final:
        cta_html = f"""
        <div style="margin: 28px 0; text-align: center;">
            <a href="{link_final}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                {cta_texto} &rarr;
            </a>
        </div>
        """

    return f"""
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
                <span class="brand">⚡ SHM - Support Hours Manager</span>
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
