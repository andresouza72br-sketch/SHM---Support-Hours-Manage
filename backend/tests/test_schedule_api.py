from datetime import timedelta
from unittest.mock import patch
import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.schedule.models import Agendamento, StatusAgendamento, TipoEventoSchedule
from apps.schedule.services import ScheduleService

@pytest.mark.django_db
class TestScheduleAPI:
    def setup_method(self):
        self.client = APIClient()

        self.cliente_a = Cliente.objects.create(
            razao_social="Alpha Corp Ltda",
            nome_fantasia="Alpha",
            cnpj="11111111000100",
            tipo=TipoCliente.PJ,
        )
        self.cliente_b = Cliente.objects.create(
            razao_social="Beta Corp Ltda",
            nome_fantasia="Beta",
            cnpj="22222222000100",
            tipo=TipoCliente.PJ,
        )

        self.tecnico = User.objects.create_user(
            username="tecnico_api",
            email="tecnico@shm.local",
            role=UserRole.EMPRESA_TECNICO,
        )
        self.gerente_a = User.objects.create_user(
            username="gerente_a",
            email="gerente@alpha.com",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente_a,
        )
        self.gerente_b = User.objects.create_user(
            username="gerente_b",
            email="gerente@beta.com",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente_b,
        )

        # Reunião para cliente A
        self.agendamento_a = ScheduleService.criar_agendamento(
            cliente=self.cliente_a,
            organizador=self.tecnico,
            titulo="Alinhamento Alpha",
            data_inicio=timezone.now() + timedelta(days=1),
            participantes=[{"nome": "Alpha", "email": self.gerente_a.email, "usuario": self.gerente_a}],
            sincronizar_google=False,
        )
        # Reunião para cliente B
        self.agendamento_b = ScheduleService.criar_agendamento(
            cliente=self.cliente_b,
            organizador=self.tecnico,
            titulo="Alinhamento Beta",
            data_inicio=timezone.now() + timedelta(days=2),
            participantes=[{"nome": "Beta", "email": self.gerente_b.email, "usuario": self.gerente_b}],
            sincronizar_google=False,
        )

    def test_tecnico_visualiza_todos_agendamentos(self):
        self.client.force_authenticate(user=self.tecnico)
        res = self.client.get("/api/v1/schedule/agendamentos/")
        assert res.status_code == status.HTTP_200_OK
        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        ids = [item["id"] for item in results]
        assert str(self.agendamento_a.id) in ids
        assert str(self.agendamento_b.id) in ids

    def test_isolamento_multitenant_cliente_ve_apenas_sua_empresa(self):
        self.client.force_authenticate(user=self.gerente_a)
        res = self.client.get("/api/v1/schedule/agendamentos/")
        assert res.status_code == status.HTTP_200_OK
        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        ids = [item["id"] for item in results]
        assert str(self.agendamento_a.id) in ids
        assert str(self.agendamento_b.id) not in ids

    def test_cliente_nao_consegue_criar_agendamento_para_outro_cliente(self):
        self.client.force_authenticate(user=self.gerente_a)
        payload = {
            "cliente": self.cliente_b.id,
            "titulo": "Tentativa Invasiva",
            "data_inicio": (timezone.now() + timedelta(days=3)).isoformat(),
            "duracao_minutos": 45,
            "sincronizar_google": False,
        }
        res = self.client.post("/api/v1/schedule/agendamentos/", payload, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    @patch("apps.schedule.google_service.GoogleCalendarService.criar_evento")
    def test_tecnico_cria_agendamento_com_sucesso(self, mock_google):
        mock_google.return_value = {
            "success": True,
            "google_event_id": "evt_google_999",
            "google_meet_link": "https://meet.google.com/shm-test-meet",
        }
        self.client.force_authenticate(user=self.tecnico)
        payload = {
            "cliente": self.cliente_a.id,
            "titulo": "Apresentação de Orçamento",
            "tipo": TipoEventoSchedule.ORCAMENTO,
            "data_inicio": (timezone.now() + timedelta(days=1)).isoformat(),
            "duracao_minutos": 45,
            "participantes": [
                {"nome": "Gerente", "email": "gerente@alpha.com", "usuario": self.gerente_a.id}
            ],
            "sincronizar_google": True,
        }
        res = self.client.post("/api/v1/schedule/agendamentos/", payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["google_meet_link"] == "https://meet.google.com/shm-test-meet"
        assert res.data["google_sincronizado"] is True

    def test_cancelamento_de_agendamento(self):
        self.client.force_authenticate(user=self.tecnico)
        res = self.client.post(
            f"/api/v1/schedule/agendamentos/{self.agendamento_a.id}/cancelar/",
            {"motivo": "Reunião desnecessária, resolvido por chamado."},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == StatusAgendamento.CANCELADO
        assert res.data["motivo_cancelamento"] == "Reunião desnecessária, resolvido por chamado."

    def test_endpoint_proxima_reuniao(self):
        self.client.force_authenticate(user=self.gerente_a)
        res = self.client.get("/api/v1/schedule/agendamentos/proxima/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data is not None
        assert res.data["id"] == str(self.agendamento_a.id)
