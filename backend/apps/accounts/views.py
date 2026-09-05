from datetime import timedelta
from django.conf import settings
from django.utils import timezone
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
from apps.accounts.models import User, PasswordlessLoginToken
from apps.accounts.serializers import UserSerializer, UserCreateSerializer, GoogleAuthSerializer
from apps.accounts.services import AuthService
from apps.core.permissions import IsEmpresaAdmin
from apps.core.utils import get_client_ip, get_client_user_agent

MAGIC_LOGIN_EXPIRATION_MINUTES = 15

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.select_related("cliente").all().order_by("first_name", "username")
    
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

        resultado, status_code, erro = AuthService.autenticar_google(credential, client_id)
        if erro:
            return Response(erro, status=status_code)

        return Response(
            {
                "access": resultado["access"],
                "refresh": resultado["refresh"],
                "user": UserSerializer(resultado["user"]).data,
            },
            status=status.HTTP_200_OK,
        )

class PasswordlessRequestView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        token_obj, status_code, erro = AuthService.solicitar_magic_login(email)
        if erro:
            return Response(erro, status=status_code)

        return Response({
            "detail": "Link seguro de acesso emitido com sucesso (validade: 15 minutos).",
            "token": str(token_obj.token) if settings.DEBUG else None,
            "expira_em": token_obj.expira_em.isoformat(),
        })

class PasswordlessVerifyView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_str = request.data.get("token")
        ip = get_client_ip(request)
        ua = get_client_user_agent(request)

        resultado, status_code, erro = AuthService.verificar_magic_login(token_str, ip, ua)
        if erro:
            return Response(erro, status=status_code)

        return Response({
            "access": resultado["access"],
            "refresh": resultado["refresh"],
            "user": UserSerializer(resultado["user"]).data,
            "metodo": resultado["metodo"],
            "ip_origem": resultado["ip_origem"],
        })