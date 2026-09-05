from datetime import timedelta
import pytest
from django.utils import timezone
from django.db import IntegrityError
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.pedidos.models import Pedido
from apps.ciclos.models import Ciclo
from apps.schedule.models import (
    Agendamento,
    ParticipanteAgendamento,
    LembreteAgendamento,
    TipoEventoSchedule,
    StatusAgendamento,
    TipoParticipante,
    StatusPresenca,
    MarcoLembrete,
    StatusLembrete,
)

@pytest.mark.django_db
class TestScheduleModels:
    def setup_method(self):
        self.cliente = Cliente.objects.create(
            razao_social="Alpha Tech Ltda",
            nome_fantasia="Alpha",
            cnpj="12345678000100",
            tipo=TipoCliente.PJ,
        )
        self.outro_cliente = Cliente.objects.create(
            razao_social="Beta Corp S/A",
            nome_fantasia="Beta",
            cnpj="98765432000199",
            tipo=TipoCliente.PJ,
        )
        self.tecnico = User.objects.create_user(
            username="tecnico1",
            email="tecnico1@shm.local",
            role=UserRole.EMPRESA_TECNICO,
        )
        self.cliente_user = User.objects.create_user(
            username="gerente_alpha",
            email="gerente@alpha.com",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente,
        )

    def test_criacao_agendamento_com_duracao_padrao_45_min(self):
        inicio = timezone.now() + timedelta(days=1)
        agendamento = Agendamento.objects.create(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Alinhamento Inicial de Suporte",
            descricao="Reunião para entender o problema relatado no chamado.",
            tipo=TipoEventoSchedule.ALINHAMENTO,
            data_inicio=inicio,
        )
        assert agendamento.duracao_minutos == 45
        assert agendamento.data_fim == inicio + timedelta(minutes=45)
        assert agendamento.status == StatusAgendamento.AGENDADO
        assert agendamento.google_sincronizado is False
        assert agendamento.google_meet_link is None

    def test_criacao_agendamento_com_duracao_customizada(self):
        inicio = timezone.now() + timedelta(days=2)
        fim = inicio + timedelta(minutes=90)
        agendamento = Agendamento.objects.create(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Workshop de Homologação",
            data_inicio=inicio,
            data_fim=fim,
            duracao_minutos=90,
        )
        assert agendamento.duracao_minutos == 90
        assert agendamento.data_fim == fim

    def test_participantes_agendamento(self):
        inicio = timezone.now() + timedelta(days=1)
        agendamento = Agendamento.objects.create(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Reunião de Orçamento",
            data_inicio=inicio,
        )
        part1 = ParticipanteAgendamento.objects.create(
            agendamento=agendamento,
            usuario=self.tecnico,
            nome="Técnico 1",
            email="tecnico1@shm.local",
            tipo=TipoParticipante.ORGANIZADOR,
        )
        part2 = ParticipanteAgendamento.objects.create(
            agendamento=agendamento,
            usuario=self.cliente_user,
            nome="Gerente Alpha",
            email="gerente@alpha.com",
            tipo=TipoParticipante.CLIENTE,
        )
        assert agendamento.participantes.count() == 2
        assert part1.status_presenca == StatusPresenca.PENDENTE

        # Deve barrar duplicidade do mesmo e-mail no mesmo agendamento
        with pytest.raises(IntegrityError):
            ParticipanteAgendamento.objects.create(
                agendamento=agendamento,
                nome="Duplicado",
                email="gerente@alpha.com",
            )

    def test_vinculo_com_pedido_e_ciclo(self):
        from apps.contratos.models import Contrato
        from decimal import Decimal
        contrato = Contrato.objects.create(
            cliente=self.cliente,
            numero="CT-2026-0099",
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            criado_por=self.tecnico,
        )
        pedido = Pedido.objects.create(
            cliente=self.cliente,
            contrato=contrato,
            criado_por=self.cliente_user,
            assunto="Problema no Gateway de Pagamento",
            descricao="Erro 500 no checkout.",
        )
        ciclo = Ciclo.objects.create(
            pedido=pedido,
            operador=self.tecnico,
            tipo="corretiva",
            horas_estimadas=Decimal("4.00"),
        )
        inicio = timezone.now() + timedelta(hours=3)
        agendamento = Agendamento.objects.create(
            cliente=self.cliente,
            pedido=pedido,
            ciclo=ciclo,
            organizador=self.tecnico,
            titulo=f"Apresentação de Orçamento - {pedido.protocolo}",
            tipo=TipoEventoSchedule.ORCAMENTO,
            data_inicio=inicio,
        )
        assert agendamento.pedido == pedido
        assert agendamento.ciclo == ciclo
        assert pedido.agendamentos.count() == 1
