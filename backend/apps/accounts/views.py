from django.conf import settings
try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False
    id_token = None
    google_requests = None

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema
from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer, UserCreateSerializer, GoogleAuthSerializer
from apps.core.permissions import IsEmpresaAdmin

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.select_related("cliente").all()
    
    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsEmpresaAdmin()]
        return [permissions.IsAuthenticated()]

class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=GoogleAuthSerializer,
        responses={200: UserSerializer, 400: dict, 403: dict},
        summary="Autenticação com Google OAuth2",
        description="Recebe o credential (id_token) retornado pelo Google Identity Services, valida e emite tokens JWT se o e-mail estiver cadastrado no SHM.",
    )
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        credential = serializer.validated_data["credential"]
        client_id = getattr(settings, "GOOGLE_CLIENT_ID", "") or None

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
                return Response(
                    {"detail": "A biblioteca 'google-auth' não está instalada no ambiente Python do servidor."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            try:
                idinfo = id_token.verify_oauth2_token(
                    credential,
                    google_requests.Request(),
                    client_id,
                )
            except ValueError as e:
                return Response(
                    {"detail": f"Credencial do Google inválida ou expirada: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception as e:
                return Response(
                    {"detail": f"Falha ao validar credencial com o Google: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        email = idinfo.get("email")
        email_verified = idinfo.get("email_verified", False)

        if not email:
            return Response(
                {"detail": "Não foi possível recuperar o e-mail associado à conta Google."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not email_verified:
            return Response(
                {"detail": "O endereço de e-mail da conta Google não está verificado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Regra B2B: Bloquear quem não possui e-mail cadastrado na base SHM
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {
                    "detail": f"O e-mail '{email}' não está autorizado na plataforma SHM. Solicite o cadastro ao administrador da empresa ou cliente vinculado.",
                    "email": email,
                    "code": "user_not_found",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.is_active:
            return Response(
                {
                    "detail": "Este usuário encontra-se inativo no sistema SHM. Contate o suporte.",
                    "code": "user_inactive",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

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
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )

class PasswordlessRequestView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from datetime import timedelta
        from django.utils import timezone
        from apps.accounts.models import PasswordlessLoginToken

        email = request.data.get("email", "").strip()
        if not email:
            return Response({"detail": "Informe o endereço de e-mail."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return Response(
                {"detail": f"O e-mail '{email}' não está cadastrado na plataforma SHM."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Expiração curta de 15 minutos
        expira_em = timezone.now() + timedelta(minutes=15)
        token_obj = PasswordlessLoginToken.objects.create(
            user=user,
            expira_em=expira_em,
            usado=False,
        )

        return Response({
            "detail": "Link seguro de acesso emitido com sucesso (validade: 15 minutos).",
            "token": str(token_obj.token) if settings.DEBUG else None,
            "expira_em": expira_em.isoformat(),
        })

class PasswordlessVerifyView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.utils import timezone
        from apps.accounts.models import PasswordlessLoginToken
        from apps.core.utils import get_client_ip, get_client_user_agent

        token_str = request.data.get("token")
        if not token_str:
            return Response({"detail": "Token não informado."}, status=status.HTTP_400_BAD_REQUEST)

        token_obj = PasswordlessLoginToken.objects.select_related("user").filter(token=token_str).first()
        if not token_obj:
            return Response({"detail": "Token inválido ou não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if token_obj.usado:
            data_formatada = token_obj.usado_em.strftime("%d/%m/%Y às %H:%M") if token_obj.usado_em else "data anterior"
            return Response(
                {"detail": f"Este link seguro de login já foi utilizado em {data_formatada}."},
                status=status.HTTP_409_CONFLICT,
            )

        if timezone.now() > token_obj.expira_em:
            return Response(
                {"detail": "Este link de login expirou (validade de 15 minutos). Solicite um novo link."},
                status=status.HTTP_410_GONE,
            )

        # Auditoria Forense
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)

        token_obj.usado = True
        token_obj.usado_em = timezone.now()
        token_obj.ip_origem = ip
        token_obj.user_agent = ua
        token_obj.save(update_fields=["usado", "usado_em", "ip_origem", "user_agent"])

        user = token_obj.user
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
            "metodo": "MAGIC_LINK_PASSWORDLESS",
            "ip_origem": ip,
        })