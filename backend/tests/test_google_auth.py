from unittest.mock import patch
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente

@pytest.mark.django_db
class TestGoogleAuthentication:
    def setup_method(self):
        self.client = APIClient()
        self.cliente_mktdnb = Cliente.objects.create(
            razao_social="MKT-DNB Soluções Digitais Ltda",
            nome_fantasia="mkt-dnb",
            cnpj="11223344000199",
            tipo=TipoCliente.PJ,
        )
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@shm.local",
            first_name="Carlos",
            last_name="Diretor",
            role=UserRole.EMPRESA_ADMIN,
        )
        self.gerente_mktdnb = User.objects.create_user(
            username="gerente.mktdnb",
            email="gerente@mktdnb.local",
            first_name="Marcelo",
            last_name="Ribeiro",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente_mktdnb,
        )
        self.inativo_user = User.objects.create_user(
            username="inativo",
            email="inativo@empresa.com",
            role=UserRole.EMPRESA_TECNICO,
            is_active=False,
        )

    @patch("apps.accounts.views.id_token.verify_oauth2_token")
    def test_google_login_empresa_admin_success(self, mock_verify):
        mock_verify.return_value = {
            "email": "admin@shm.local",
            "email_verified": True,
            "given_name": "Carlos",
            "family_name": "Diretor",
            "picture": "https://lh3.googleusercontent.com/a/admin-photo-url",
        }
        res = self.client.post("/api/v1/auth/google/", {"credential": "fake_google_token"})
        assert res.status_code == status.HTTP_200_OK
        assert "access" in res.data
        assert "refresh" in res.data
        assert res.data["user"]["email"] == "admin@shm.local"
        assert res.data["user"]["role"] == UserRole.EMPRESA_ADMIN
        assert res.data["user"]["is_empresa"] is True
        assert res.data["user"]["avatar_url"] == "https://lh3.googleusercontent.com/a/admin-photo-url"
        self.admin_user.refresh_from_db()
        assert self.admin_user.avatar_url == "https://lh3.googleusercontent.com/a/admin-photo-url"

    @patch("apps.accounts.views.id_token.verify_oauth2_token")
    def test_google_login_cliente_gerente_mktdnb_success(self, mock_verify):
        mock_verify.return_value = {
            "email": "gerente@mktdnb.local",
            "email_verified": True,
            "given_name": "Marcelo",
            "family_name": "Ribeiro",
        }
        res = self.client.post("/api/v1/auth/google/", {"credential": "fake_google_token_mktdnb"})
        assert res.status_code == status.HTTP_200_OK
        assert "access" in res.data
        assert "refresh" in res.data
        assert res.data["user"]["email"] == "gerente@mktdnb.local"
        assert res.data["user"]["role"] == UserRole.CLIENTE_GERENTE
        assert res.data["user"]["is_cliente"] is True
        assert res.data["user"]["cliente_nome"] == "mkt-dnb"

    @patch("apps.accounts.views.id_token.verify_oauth2_token")
    def test_google_login_unauthorized_email_blocked(self, mock_verify):
        mock_verify.return_value = {
            "email": "estranho@gmail.com",
            "email_verified": True,
            "given_name": "Estranho",
            "family_name": "Silva",
        }
        res = self.client.post("/api/v1/auth/google/", {"credential": "fake_token_unauthorized"})
        assert res.status_code == status.HTTP_403_FORBIDDEN
        assert "não está autorizado" in res.data["detail"]
        assert res.data["code"] == "user_not_found"

    @patch("apps.accounts.views.id_token.verify_oauth2_token")
    def test_google_login_inactive_user_blocked(self, mock_verify):
        mock_verify.return_value = {
            "email": "inativo@empresa.com",
            "email_verified": True,
        }
        res = self.client.post("/api/v1/auth/google/", {"credential": "fake_token_inactive"})
        assert res.status_code == status.HTTP_403_FORBIDDEN
        assert "inativo" in res.data["detail"]
        assert res.data["code"] == "user_inactive"

    @patch("apps.accounts.views.id_token.verify_oauth2_token")
    def test_google_login_unverified_email_blocked(self, mock_verify):
        mock_verify.return_value = {
            "email": "admin@shm.local",
            "email_verified": False,
        }
        res = self.client.post("/api/v1/auth/google/", {"credential": "fake_unverified_token"})
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "não está verificado" in res.data["detail"]

    @patch("apps.accounts.views.id_token.verify_oauth2_token")
    def test_google_login_invalid_token_error(self, mock_verify):
        mock_verify.side_effect = ValueError("Token has expired")
        res = self.client.post("/api/v1/auth/google/", {"credential": "expired_token"})
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "inválida ou expirada" in res.data["detail"]

    def test_google_login_missing_credential(self):
        res = self.client.post("/api/v1/auth/google/", {})
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_token_refresh_rotates_and_blacklists_previous_token(self):
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(self.admin_user)
        refresh_str = str(refresh)

        # 1º Refresh com sucesso
        res = self.client.post("/api/v1/auth/token/refresh/", {"refresh": refresh_str})
        assert res.status_code == status.HTTP_200_OK
        assert "access" in res.data
        assert "refresh" in res.data
        new_refresh = res.data["refresh"]

        # 2º Tentativa de reutilizar o token anterior rotacionado (deve falhar por estar na blacklist)
        res_reuse = self.client.post("/api/v1/auth/token/refresh/", {"refresh": refresh_str})
        assert res_reuse.status_code == status.HTTP_401_UNAUTHORIZED

        # 3º Novo token emitido na rotação funciona normalmente
        res_new = self.client.post("/api/v1/auth/token/refresh/", {"refresh": new_refresh})
        assert res_new.status_code == status.HTTP_200_OK
