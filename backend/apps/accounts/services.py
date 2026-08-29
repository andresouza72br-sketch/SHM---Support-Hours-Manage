import logging
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.models import User, PasswordlessLoginToken

try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False
    id_token = None
    google_requests = None

logger = logging.getLogger(__name__)

MAGIC_LOGIN_EXPIRATION_MINUTES = 15

class AuthService:
    @staticmethod
    def autenticar_google(credential: str, client_id: str = None) -> tuple[dict | None, int, dict]:
        """
        Valida o ID Token do Google OAuth2, aplica regras B2B do SHM,
        sincroniza perfil e gera os tokens JWT de sessão.
        
        Retorna:
            (resultado_sucesso, status_http, erro_dict)
        """
        if settings.DEBUG and credential.startswith("dev_simulated_token:"):
            sim_email = credential.split("dev_simulated_token:", 1)[1].strip()
            idinfo = {
                "email": sim_email,
                "email_verified": True,
                "given_name": sim_email.split("@")[0].capitalize(),
                "family_name": "Google",
                "picture": f"https://api.dicebear.com/7.x/avataaars/svg?seed={sim_email}",
            }
        else:
            if not GOOGLE_AUTH_AVAILABLE:
                return None, 500, {"detail": "A biblioteca 'google-auth' não está instalada no ambiente Python do servidor."}
            try:
                idinfo = id_token.verify_oauth2_token(
                    credential,
                    google_requests.Request(),
                    client_id,
                )
            except ValueError as e:
                return None, 400, {"detail": f"Credencial do Google inválida ou expirada: {str(e)}"}
            except Exception as e:
                return None, 400, {"detail": f"Falha ao validar credencial com o Google: {str(e)}"}

        email = idinfo.get("email")
        email_verified = idinfo.get("email_verified", False)

        if not email:
            return None, 400, {"detail": "Não foi possível recuperar o e-mail associado à conta Google."}

        if not email_verified:
            return None, 400, {"detail": "O endereço de e-mail da conta Google não está verificado."}

        # Regra B2B: Bloquear quem não possui e-mail cadastrado na base SHM
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return None, 403, {
                "detail": f"O e-mail '{email}' não está autorizado na plataforma SHM. Solicite o cadastro ao administrador da empresa ou cliente vinculado.",
                "email": email,
                "code": "user_not_found",
            }

        if not user.is_active:
            return None, 403, {
                "detail": "Este usuário encontra-se inativo no sistema SHM. Contate o suporte.",
                "code": "user_inactive",
            }

        given_name = idinfo.get("given_name")
        family_name = idinfo.get("family_name")
        picture = idinfo.get("picture")

        update_fields = []
        if picture and user.avatar_url != picture:
            user.avatar_url = picture
            update_fields.append("avatar_url")
        if given_name and not user.first_name:
            user.first_name = given_name
            update_fields.append("first_name")
        if family_name and not user.last_name:
            user.last_name = family_name
            update_fields.append("last_name")
        if update_fields:
            user.save(update_fields=update_fields)

        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user,
        }, 200, {}

    @staticmethod
    def solicitar_magic_login(email: str) -> tuple[PasswordlessLoginToken | None, int, dict]:
        """
        Emite um token de acesso sem senha de 15 minutos para usuário ativo.
        """
        if not email:
            return None, 400, {"detail": "Informe o endereço de e-mail."}

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return None, 404, {"detail": f"O e-mail '{email}' não está cadastrado na plataforma SHM."}

        expira_em = timezone.now() + timedelta(minutes=MAGIC_LOGIN_EXPIRATION_MINUTES)
        token_obj = PasswordlessLoginToken.objects.create(
            user=user,
            expira_em=expira_em,
            usado=False,
        )
        return token_obj, 200, {}

    @staticmethod
    def verificar_magic_login(token_str: str, ip: str = None, user_agent: str = None) -> tuple[dict | None, int, dict]:
        """
        Valida o token sem senha, aplica auditoria forense (IP/User-Agent),
        marca como consumido e emite o par de tokens JWT.
        """
        if not token_str:
            return None, 400, {"detail": "Token não informado."}

        token_obj = PasswordlessLoginToken.objects.select_related("user").filter(token=token_str).first()
        if not token_obj:
            return None, 404, {"detail": "Token inválido ou não encontrado."}

        if token_obj.usado:
            data_formatada = token_obj.usado_em.strftime("%d/%m/%Y às %H:%M") if token_obj.usado_em else "data anterior"
            return None, 409, {"detail": f"Este link seguro de login já foi utilizado em {data_formatada}."}

        if token_obj.esta_expirado():
            return None, 410, {"detail": "Este link de login expirou (validade de 15 minutos). Solicite um novo link."}

        agora = timezone.now()
        token_obj.usado = True
        token_obj.usado_em = agora
        token_obj.ip_origem = ip
        token_obj.user_agent = user_agent
        token_obj.save(update_fields=["usado", "usado_em", "ip_origem", "user_agent"])

        user = token_obj.user
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user,
            "metodo": "MAGIC_LINK_PASSWORDLESS",
            "ip_origem": ip,
        }, 200, {}
