from datetime import timedelta
from unittest.mock import patch, MagicMock
import pytest
from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.schedule.models import (
    Agendamento,
    ParticipanteAgendamento,
    LembreteAgendamento,
    TipoEventoSchedule,
    StatusAgendamento,
    MarcoLembrete,
    StatusLembrete,
)
from apps.schedule.services import ScheduleService

@pytest.mark.django_db
class TestScheduleLembretes:
    def setup_method(self):
        self.cliente = Cliente.objects.create(
            razao_social="Gamma Soft Ltda",
            nome_fantasia="Gamma",
            cnpj="55443322000188",
            tipo=TipoCliente.PJ,
        )
        self.tecnico = User.objects.create_user(
            username="tecnico_lembrete",
            email="tecnico_lembrete@shm.local",
            role=UserRole.EMPRESA_TECNICO,
        )
        self.cliente_user = User.objects.create_user(
            username="cliente_gamma",
            email="contato@gamma.com",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente,
        )

    def test_geracao_automatica_dos_tres_marcos_na_criacao(self):
        inicio = timezone.now() + timedelta(days=2) # Mais de 24h à frente
        agendamento = ScheduleService.criar_agendamento(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Apresentação de Resultados",
            data_inicio=inicio,
            participantes=[
                {"nome": "Técnico", "email": self.tecnico.email, "usuario": self.tecnico},
                {"nome": "Cliente", "email": self.cliente_user.email, "usuario": self.cliente_user},
            ],
            sincronizar_google=False,
        )
        lembretes = agendamento.lembretes.all()
        assert lembretes.count() == 3
        marcos = {l.marco: l for l in lembretes}
        assert MarcoLembrete.MARCO_24H in marcos
        assert MarcoLembrete.MARCO_30M in marcos
        assert MarcoLembrete.MARCO_15M in marcos
        assert all(l.status == StatusLembrete.PENDENTE for l in lembretes)

    def test_marcos_passados_sao_ignorados_em_agendamento_urgente(self):
        # Agendamento para daqui a 20 minutos (24h e 30m já passaram)
        inicio = timezone.now() + timedelta(minutes=20)
        agendamento = ScheduleService.criar_agendamento(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Alinhamento Urgente",
            data_inicio=inicio,
            participantes=[
                {"nome": "Cliente", "email": self.cliente_user.email, "usuario": self.cliente_user},
            ],
            sincronizar_google=False,
        )
        lembretes = {l.marco: l for l in agendamento.lembretes.all()}
        assert lembretes[MarcoLembrete.MARCO_24H].status == StatusLembrete.IGNORADO
        assert lembretes[MarcoLembrete.MARCO_30M].status == StatusLembrete.IGNORADO
        assert lembretes[MarcoLembrete.MARCO_15M].status == StatusLembrete.PENDENTE

    def test_disparo_idempotente_de_lembretes(self):
        # Agendamento cujo marco de 15 min deve disparar agora
        inicio = timezone.now() + timedelta(minutes=14)
        agendamento = ScheduleService.criar_agendamento(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Sessão de Homologação",
            data_inicio=inicio,
            participantes=[
                {"nome": "Cliente", "email": self.cliente_user.email, "usuario": self.cliente_user},
            ],
            sincronizar_google=False,
        )

        total_disparados = ScheduleService.processar_lembretes_pendentes()
        assert total_disparados >= 1

        lembrete_15m = agendamento.lembretes.get(marco=MarcoLembrete.MARCO_15M)
        assert lembrete_15m.status == StatusLembrete.ENVIADO
        assert lembrete_15m.disparado_em is not None

        # Verifica se a notificação in-app foi gerada para o cliente
        from apps.notificacoes.models import Notification
        notif = Notification.objects.filter(usuario=self.cliente_user, titulo__contains="15 Minutos").first()
        assert notif is not None

        # Segunda execução subsequente imediata não deve re-disparar (idempotência)
        segundo_disparo = ScheduleService.processar_lembretes_pendentes()
        assert segundo_disparo == 0
