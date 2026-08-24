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
            email="andresouza72br@gmail.com",
            first_name="Carlos",
            last_name="Diretor",
            role=UserRole.EMPRESA_ADMIN,
        )
        self.gerente_mktdnb = User.objects.create_user(
            username="gerente.mktdnb",
            email="workspace.icb@gmail.com",
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
            "email": "andresouza72br@gmail.com",
            "email_verified": True,
            "given_name": "Carlos",
            "family_name": "Diretor",
        }
        res = self.client.post("/api/v1/auth/google/", {"credential": "fake_google_token"})
        assert res.status_code == status.HTTP_200_OK
        assert "access" in res.data
        assert "refresh" in res.data
        assert res.data["user"]["email"] == "andresouza72br@gmail.com"
        assert res.data["user"]["role"] == UserRole.EMPRESA_ADMIN
        assert res.data["user"]["is_empresa"] is True

    @patch("apps.accounts.views.id_token.verify_oauth2_token")
    def test_google_login_cliente_gerente_mktdnb_success(self, mock_verify):
        mock_verify.return_value = {
            "email": "workspace.icb@gmail.com",
            "email_verified": True,
            "given_name": "Marcelo",
            "family_name": "Ribeiro",
        }
        res = self.client.post("/api/v1/auth/google/", {"credential": "fake_google_token_mktdnb"})
        assert res.status_code == status.HTTP_200_OK
        assert "access" in res.data
        assert "refresh" in res.data
        assert res.data["user"]["email"] == "workspace.icb@gmail.com"
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
            "email": "andresouza72br@gmail.com",
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
