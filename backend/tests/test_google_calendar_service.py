from unittest.mock import patch, MagicMock
from datetime import timedelta
import pytest
from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.schedule.models import Agendamento, ParticipanteAgendamento, TipoEventoSchedule
from apps.schedule.google_service import GoogleCalendarService

@pytest.mark.django_db
class TestGoogleCalendarService:
    def setup_method(self):
        self.cliente = Cliente.objects.create(
            razao_social="Beta Tech Ltda",
            nome_fantasia="Beta",
            cnpj="99887766000155",
            tipo=TipoCliente.PJ,
        )
        self.tecnico = User.objects.create_user(
            username="tecnico_google",
            email="tecnico@shm.local",
            role=UserRole.EMPRESA_TECNICO,
        )
        self.cliente_user = User.objects.create_user(
            username="cliente_beta",
            email="gestor@beta.com",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente,
        )
        inicio = timezone.now() + timedelta(days=1)
        self.agendamento = Agendamento.objects.create(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Reunião de Diagnóstico de Falhas",
            descricao="Análise técnica do banco de dados.",
            tipo=TipoEventoSchedule.ALINHAMENTO,
            data_inicio=inicio,
        )
        ParticipanteAgendamento.objects.create(
            agendamento=self.agendamento,
            usuario=self.tecnico,
            nome="Técnico SHM",
            email="tecnico@shm.local",
        )
        ParticipanteAgendamento.objects.create(
            agendamento=self.agendamento,
            usuario=self.cliente_user,
            nome="Gestor Beta",
            email="gestor@beta.com",
        )

    @patch("apps.schedule.google_service.GoogleCalendarService._obter_sessao_autenticada")
    def test_criar_evento_com_sucesso_gerando_google_meet(self, mock_auth):
        mock_session = MagicMock()
        mock_auth.return_value = mock_session
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "google_event_123456",
            "status": "confirmed",
            "hangoutLink": "https://meet.google.com/abc-defg-hij",
            "summary": "Reunião de Diagnóstico de Falhas",
        }
        mock_session.post.return_value = mock_response

        service = GoogleCalendarService()
        res = service.criar_evento(self.agendamento)

        assert res["success"] is True
        assert res["google_event_id"] == "google_event_123456"
        assert res["google_meet_link"] == "https://meet.google.com/abc-defg-hij"

    @patch("apps.schedule.google_service.GoogleCalendarService._obter_sessao_autenticada")
    def test_criar_evento_falha_de_comunicacao(self, mock_auth):
        mock_session = MagicMock()
        mock_auth.return_value = mock_session
        mock_response = MagicMock()
        mock_response.status_code = 503
        mock_response.text = "Service Unavailable"
        mock_session.post.return_value = mock_response

        service = GoogleCalendarService()
        res = service.criar_evento(self.agendamento)

        assert res["success"] is False
        assert "erro" in res or "error" in res

    @patch("apps.schedule.google_service.GoogleCalendarService._obter_sessao_autenticada")
    def test_atualizar_evento_com_sucesso(self, mock_auth):
        self.agendamento.google_event_id = "google_event_123456"
        self.agendamento.save()

        mock_session = MagicMock()
        mock_auth.return_value = mock_session
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "google_event_123456",
            "status": "confirmed",
            "hangoutLink": "https://meet.google.com/abc-defg-hij",
        }
        mock_session.patch.return_value = mock_response

        service = GoogleCalendarService()
        res = service.atualizar_evento(self.agendamento)

        assert res["success"] is True

    @patch("apps.schedule.google_service.GoogleCalendarService._obter_sessao_autenticada")
    def test_cancelar_evento_com_sucesso(self, mock_auth):
        self.agendamento.google_event_id = "google_event_123456"
        self.agendamento.save()

        mock_session = MagicMock()
        mock_auth.return_value = mock_session
        mock_response = MagicMock()
        mock_response.status_code = 204
        mock_session.delete.return_value = mock_response

        service = GoogleCalendarService()
        res = service.cancelar_evento(self.agendamento)

        assert res["success"] is True
