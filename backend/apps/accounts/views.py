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
        changed = False
        if given_name and not user.first_name:
            user.first_name = given_name
            changed = True
        if family_name and not user.last_name:
            user.last_name = family_name
            changed = True
        if changed:
            user.save(update_fields=["first_name", "last_name"])

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )