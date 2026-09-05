import pytest
from datetime import timedelta
from unittest.mock import patch
from decimal import Decimal
from django.utils import timezone
from django.core import mail
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente, ClienteAuditLog
from apps.contratos.models import Contrato, StatusContrato, ContratoAuditLog, ForensicAuditLog
from apps.contratos.forensic_service import ForensicAuditService
from apps.pedidos.models import Pedido
from apps.ciclos.models import Ciclo
from apps.schedule.models import (
    Agendamento,
    ParticipanteAgendamento,
    LembreteAgendamento,
    StatusAgendamento,
    TipoEventoSchedule,
    TipoParticipante,
    MarcoLembrete,
    StatusLembrete,
)
from apps.schedule.services import ScheduleService
from apps.notificacoes.models import (
    Notification,
    TimelineEvent,
    TipoEventoTimeline,
    ConfiguracaoNotificacao,
)
from apps.notificacoes.config_service import NotificacaoConfigService


@pytest.mark.django_db
class TestScheduleNotificacoesEAuditoria:
    def setup_method(self):
        self.client = APIClient()

        self.cliente = Cliente.objects.create(
            razao_social="Alpha Cloud Solutions SA",
            nome_fantasia="Alpha Cloud",
            cnpj="11223344000199",
            tipo=TipoCliente.PJ,
            email_contato="contato@alphacloud.com",
            emails_notificacao_padrao=["notif_cliente@alphacloud.com"],
        )

        self.admin = User.objects.create_user(
            username="admin_agenda",
            email="admin.agenda@shm.local",
            role=UserRole.EMPRESA_ADMIN,
            is_staff=True,
        )
        self.tecnico = User.objects.create_user(
            username="tecnico_agenda",
            email="tecnico.agenda@shm.local",
            role=UserRole.EMPRESA_TECNICO,
        )
        self.gerente_cliente = User.objects.create_user(
            username="gerente_alpha",
            email="gerente@alphacloud.com",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente,
        )
        self.analista_cliente = User.objects.create_user(
            username="analista_alpha",
            email="analista@alphacloud.com",
            role=UserRole.CLIENTE_ANALISTA,
            cliente=self.cliente,
        )

        self.contrato = Contrato.objects.create(
            numero="CT-2026-7001",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("40.00"),
            saldo=Decimal("40.00"),
            status=StatusContrato.ATIVO,
            gestor_nome="Gestor de Contratos",
            gestor_email="gestor.contrato@alphacloud.com",
            emails_notificacao=[{"email": "cc.contrato@alphacloud.com", "ativo": True}],
            criado_por=self.admin,
        )

        self.pedido = Pedido.objects.create(
            cliente=self.cliente,
            contrato=self.contrato,
            criado_por=self.gerente_cliente,
            assunto="Instabilidade no Módulo Financeiro",
            descricao="Falhas intermitentes ao processar webhook.",
        )

        self.ciclo = Ciclo.objects.create(
            pedido=self.pedido,
            operador=self.tecnico,
            tipo="corretiva",
            horas_estimadas=Decimal("6.00"),
        )

        NotificacaoConfigService.garantir_configuracoes_padrao()
        mail.outbox.clear()
        Notification.objects.all().delete()

    def test_criacao_agendamento_dispara_notificacao_app_e_email_e_auditoria(self):
        """
        Ao criar um agendamento:
        1. Gera notificação in-app para os participantes (exceto o organizador).
        2. Dispara e-mail transacional estilizado com detalhes da reunião para participantes e CCs.
        3. Registra evento na Timeline do chamado com IP e User-Agent.
        4. Registra evento no livro-razão ForensicAuditLog com SHA-256 e cadeia íntegra.
        """
        data_inicio = timezone.now() + timedelta(days=1)
        participantes = [
            {"nome": "Técnico Responsável", "email": self.tecnico.email, "usuario": self.tecnico},
            {"nome": "Gerente Alpha", "email": self.gerente_cliente.email, "usuario": self.gerente_cliente},
            {"nome": "Consultor Externo", "email": "consultor@externo.com", "tipo": TipoParticipante.CONVIDADO},
        ]

        agendamento = ScheduleService.criar_agendamento(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Alinhamento de Incidente Financeiro",
            descricao="Analisar logs do webhook de pagamento.",
            tipo=TipoEventoSchedule.ALINHAMENTO,
            data_inicio=data_inicio,
            duracao_minutos=45,
            pedido=self.pedido,
            ciclo=self.ciclo,
            participantes=participantes,
            sincronizar_google=False,
            ip_origem="189.40.10.20",
            user_agent="Mozilla/5.0 PericialBrowser/1.0",
        )

        # 1. Notificação In-App
        assert Notification.objects.filter(usuario=self.gerente_cliente, titulo__contains="Novo Compromisso").exists()
        # O organizador NUNCA deve receber no próprio sininho
        assert not Notification.objects.filter(usuario=self.tecnico, titulo__contains="Novo Compromisso").exists()

        # 2. E-mail Transacional
        assert len(mail.outbox) >= 1
        todos_destinatarios = []
        for msg in mail.outbox:
            todos_destinatarios.extend(msg.to)
            if msg.cc:
                todos_destinatarios.extend(msg.cc)

        assert self.gerente_cliente.email.lower() in [e.lower() for e in todos_destinatarios]
        assert "consultor@externo.com" in [e.lower() for e in todos_destinatarios]
        # O autor não deve receber e-mail quando nao_enviar_autor = True
        assert self.tecnico.email.lower() not in [e.lower() for e in todos_destinatarios]

        email_enviado = mail.outbox[0]
        assert "[SHM] Reunião Agendada:" in email_enviado.subject
        assert "Alinhamento de Incidente Financeiro" in email_enviado.body
        assert "45 minutos" in email_enviado.body
        assert self.pedido.protocolo in email_enviado.body

        # 3. Timeline Forense
        timeline_evt = TimelineEvent.objects.filter(
            pedido=self.pedido,
            tipo=TipoEventoTimeline.AGENDAMENTO_CRIADO,
            agendamento=agendamento,
        ).first()
        assert timeline_evt is not None
        assert timeline_evt.autor == self.tecnico
        assert timeline_evt.ip_origem == "189.40.10.20"
        assert timeline_evt.user_agent == "Mozilla/5.0 PericialBrowser/1.0"
        assert "45 min" in timeline_evt.descricao

        # 4. Trilha Pericial de Auditoria (ForensicAuditLog com Hash Chaining)
        forensic_log = ForensicAuditLog.objects.filter(
            particao=f"contrato:{self.contrato.id}",
            tipo_evento="SCHEDULE_AGENDAMENTO_CRIADO",
        ).first()
        assert forensic_log is not None
        assert forensic_log.ip_origem == "189.40.10.20"
        assert forensic_log.user_agent == "Mozilla/5.0 PericialBrowser/1.0"
        assert forensic_log.usuario == self.tecnico
        assert forensic_log.dados_payload["agendamento_id"] == str(agendamento.id)

        # Verificação matemática da cadeia de custódia
        verificacao = ForensicAuditService.verificar_integridade_particao(f"contrato:{self.contrato.id}")
        assert verificacao["status"] == "integro"

    def test_remarcacao_agendamento_dispara_notificacao_app_e_email_e_auditoria(self):
        """
        Ao remarcar um agendamento:
        1. Recalcula a régua de lembretes.
        2. Envia notificação in-app informando nova data.
        3. Envia e-mail transacional aos participantes com o novo horário.
        4. Registra AGENDAMENTO_REMARCADO na timeline com IP e User-Agent.
        5. Registra SCHEDULE_AGENDAMENTO_REMARCADO no ForensicAuditLog preservando o hash chain.
        """
        inicio_original = timezone.now() + timedelta(days=2)
        agendamento = ScheduleService.criar_agendamento(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Apresentação de Homologação",
            data_inicio=inicio_original,
            pedido=self.pedido,
            participantes=[
                {"nome": "Gerente Alpha", "email": self.gerente_cliente.email, "usuario": self.gerente_cliente},
            ],
            sincronizar_google=False,
        )

        mail.outbox.clear()
        Notification.objects.all().delete()

        novo_inicio = timezone.now() + timedelta(days=3, hours=2)
        ScheduleService.atualizar_agendamento(
            agendamento=agendamento,
            data_inicio=novo_inicio,
            autor=self.tecnico,
            ip_origem="200.150.80.12",
            user_agent="Firefox/130.0 Updater",
        )

        agendamento.refresh_from_db()
        assert agendamento.data_inicio == novo_inicio

        # 1. Notificação In-App
        notif = Notification.objects.filter(usuario=self.gerente_cliente, titulo__contains="Reunião Remarcada").first()
        assert notif is not None
        assert novo_inicio.strftime("%d/%m/%Y") in notif.mensagem

        # 2. E-mail de Remarcação
        assert len(mail.outbox) >= 1
        msg = mail.outbox[0]
        assert "Reunião Remarcada:" in msg.subject
        assert "Novo Horário:" in msg.body

        # 3. Timeline Forense
        evt_timeline = TimelineEvent.objects.filter(
            pedido=self.pedido,
            tipo=TipoEventoTimeline.AGENDAMENTO_REMARCADO,
            agendamento=agendamento,
        ).first()
        assert evt_timeline is not None
        assert evt_timeline.ip_origem == "200.150.80.12"
        assert evt_timeline.user_agent == "Firefox/130.0 Updater"

        # 4. Trilha Pericial de Auditoria
        forensic_log = ForensicAuditLog.objects.filter(
            particao=f"contrato:{self.contrato.id}",
            tipo_evento="SCHEDULE_AGENDAMENTO_REMARCADO",
        ).first()
        assert forensic_log is not None
        assert forensic_log.ip_origem == "200.150.80.12"
        assert forensic_log.dados_payload["nova_data_inicio"] == novo_inicio.isoformat()

        # Verificação matemática
        verif = ForensicAuditService.verificar_integridade_particao(f"contrato:{self.contrato.id}")
        assert verif["status"] == "integro"

    def test_cancelamento_agendamento_dispara_notificacao_app_e_email_e_auditoria(self):
        """
        Ao cancelar um agendamento:
        1. Invalida lembretes pendentes.
        2. Envia notificação in-app com motivo aos participantes.
        3. Envia e-mail transacional detalhando o cancelamento e justificativa.
        4. Registra AGENDAMENTO_CANCELADO na timeline com IP e User-Agent.
        5. Registra SCHEDULE_AGENDAMENTO_CANCELADO no ForensicAuditLog com imutabilidade.
        """
        agendamento = ScheduleService.criar_agendamento(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Plantão de Suporte Especial",
            data_inicio=timezone.now() + timedelta(days=1),
            pedido=self.pedido,
            participantes=[
                {"nome": "Gerente Alpha", "email": self.gerente_cliente.email, "usuario": self.gerente_cliente},
            ],
            sincronizar_google=False,
        )

        mail.outbox.clear()
        Notification.objects.all().delete()

        motivo = "Problema solucionado após reinicialização do serviço pelo cliente."
        ScheduleService.cancelar_agendamento(
            agendamento=agendamento,
            motivo=motivo,
            autor=self.gerente_cliente,
            ip_origem="177.22.44.66",
            user_agent="MobileSafari/18.0",
        )

        agendamento.refresh_from_db()
        assert agendamento.status == StatusAgendamento.CANCELADO
        assert agendamento.motivo_cancelamento == motivo

        # Lembretes cancelados
        assert not agendamento.lembretes.filter(status=StatusLembrete.PENDENTE).exists()

        # 1. Notificação In-App
        notif = Notification.objects.filter(usuario=self.tecnico, titulo__contains="Compromisso Cancelado").first()
        assert notif is not None
        assert motivo in notif.mensagem

        # 2. E-mail Transacional
        assert len(mail.outbox) >= 1
        msg = mail.outbox[0]
        assert "Reunião Cancelada:" in msg.subject
        assert motivo in msg.body

        # 3. Timeline Forense
        evt_cancel = TimelineEvent.objects.filter(
            pedido=self.pedido,
            tipo=TipoEventoTimeline.AGENDAMENTO_CANCELADO,
            agendamento=agendamento,
        ).first()
        assert evt_cancel is not None
        assert evt_cancel.ip_origem == "177.22.44.66"
        assert evt_cancel.user_agent == "MobileSafari/18.0"
        assert motivo in evt_cancel.descricao

        # 4. Trilha Forense
        forensic_log = ForensicAuditLog.objects.filter(
            particao=f"contrato:{self.contrato.id}",
            tipo_evento="SCHEDULE_AGENDAMENTO_CANCELADO",
        ).first()
        assert forensic_log is not None
        assert forensic_log.ip_origem == "177.22.44.66"
        assert forensic_log.dados_payload["motivo_cancelamento"] == motivo

        verif = ForensicAuditService.verificar_integridade_particao(f"contrato:{self.contrato.id}")
        assert verif["status"] == "integro"

    def test_disparo_lembretes_24h_30m_e_15m_notificacao_app_e_email(self):
        """
        Valida que o scheduler de lembretes:
        - Para 24h e 30m: dispara notificação in-app E e-mail transacional aos participantes.
        - Para 15m: dispara notificação in-app com link direto da sala Google Meet (sem e-mail por padrão).
        - Mantém idempotência estrita sem disparos duplicados.
        """
        inicio = timezone.now() + timedelta(hours=23)
        agendamento = ScheduleService.criar_agendamento(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Reunião de Demonstração Técnica",
            data_inicio=inicio,
            pedido=self.pedido,
            participantes=[
                {"nome": "Gerente Alpha", "email": self.gerente_cliente.email, "usuario": self.gerente_cliente},
            ],
            sincronizar_google=False,
        )
        agendamento.google_meet_link = "https://meet.google.com/shm-homolog-room"
        agendamento.save(update_fields=["google_meet_link"])

        mail.outbox.clear()
        Notification.objects.all().delete()

        # Força o marco de 24h a estar vencido para disparo
        lembrete_24h = agendamento.lembretes.get(marco=MarcoLembrete.MARCO_24H)
        lembrete_24h.data_prevista = timezone.now() - timedelta(minutes=5)
        lembrete_24h.status = StatusLembrete.PENDENTE
        lembrete_24h.save()

        total = ScheduleService.processar_lembretes_pendentes()
        assert total >= 1

        lembrete_24h.refresh_from_db()
        assert lembrete_24h.status == StatusLembrete.ENVIADO

        # Notificação in-app do lembrete 24h
        notif_24h = Notification.objects.filter(usuario=self.gerente_cliente, titulo__contains="24 Horas Antes").first()
        assert notif_24h is not None

        # E-mail de lembrete 24h
        assert len(mail.outbox) >= 1
        msg_24h = mail.outbox[0]
        assert "Lembrete:" in msg_24h.subject
        assert "24 Horas Antes" in msg_24h.subject

        # Agora testa o marco de 15 min com CTA direto para a sala Meet
        mail.outbox.clear()
        Notification.objects.all().delete()

        lembrete_15m = agendamento.lembretes.get(marco=MarcoLembrete.MARCO_15M)
        lembrete_15m.data_prevista = timezone.now() - timedelta(minutes=1)
        lembrete_15m.status = StatusLembrete.PENDENTE
        lembrete_15m.save()

        total_15m = ScheduleService.processar_lembretes_pendentes()
        assert total_15m >= 1

        lembrete_15m.refresh_from_db()
        assert lembrete_15m.status == StatusLembrete.ENVIADO

        notif_15m = Notification.objects.filter(usuario=self.gerente_cliente, titulo__contains="15 Minutos Antes").first()
        assert notif_15m is not None
        # URL da notificação in-app deve direcionar diretamente para o Google Meet
        assert notif_15m.url == "https://meet.google.com/shm-homolog-room"

        # E-mail para 15m está desativado por padrão nas regras B2B anti-spam
        assert len(mail.outbox) == 0

        # Idempotência: reexecução imediata não redispara
        assert ScheduleService.processar_lembretes_pendentes() == 0

    def test_desativar_email_em_configuracao_notificacao_respeita_toggle(self):
        """
        Se o administrador desativar o toggle ativo_email para SCHEDULE_AGENDAMENTO_CRIADO,
        o sistema gera a notificação in-app mas NÃO envia e-mail.
        """
        cfg = ConfiguracaoNotificacao.objects.get(codigo="SCHEDULE_AGENDAMENTO_CRIADO")
        cfg.ativo_email = False
        cfg.save(update_fields=["ativo_email"])

        mail.outbox.clear()
        Notification.objects.all().delete()

        ScheduleService.criar_agendamento(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Reunião Silenciosa Sem E-mail",
            data_inicio=timezone.now() + timedelta(days=2),
            pedido=self.pedido,
            participantes=[
                {"nome": "Gerente Alpha", "email": self.gerente_cliente.email, "usuario": self.gerente_cliente},
            ],
            sincronizar_google=False,
        )

        # In-app gerado
        assert Notification.objects.filter(usuario=self.gerente_cliente, titulo__contains="Novo Compromisso").exists()
        # E-mail NÃO enviado
        assert len(mail.outbox) == 0

    def test_api_repassa_ip_e_user_agent_para_auditoria_completa(self):
        """
        Valida que requisições HTTP REST via AgendamentoViewSet extraem e persistem
        o IP de origem e o User-Agent nas duas camadas de auditoria (TimelineEvent e ForensicAuditLog).
        """
        self.client.force_authenticate(user=self.tecnico)
        ip_cliente = "198.51.100.77"
        ua_cliente = "SHM-Frontend/2.5 (Windows 11; x64)"

        payload = {
            "cliente": self.cliente.id,
            "titulo": "Sessão de Homologação Remota",
            "tipo": TipoEventoSchedule.HOMOLOGACAO,
            "data_inicio": (timezone.now() + timedelta(days=2)).isoformat(),
            "duracao_minutos": 60,
            "pedido": self.pedido.id,
            "participantes": [
                {"nome": "Gerente Alpha", "email": self.gerente_cliente.email, "usuario": self.gerente_cliente.id}
            ],
            "sincronizar_google": False,
        }

        res = self.client.post(
            "/api/v1/schedule/agendamentos/",
            payload,
            format="json",
            REMOTE_ADDR=ip_cliente,
            HTTP_USER_AGENT=ua_cliente,
        )
        assert res.status_code == status.HTTP_201_CREATED
        agendamento_id = res.data["id"]

        # Verifica TimelineEvent
        tl = TimelineEvent.objects.filter(agendamento_id=agendamento_id).first()
        assert tl is not None
        assert tl.ip_origem == ip_cliente
        assert tl.user_agent == ua_cliente

        # Verifica ForensicAuditLog
        f_log = ForensicAuditLog.objects.filter(
            particao=f"contrato:{self.contrato.id}",
            tipo_evento="SCHEDULE_AGENDAMENTO_CRIADO",
        ).order_by("-sequencia").first()
        assert f_log is not None
        assert f_log.ip_origem == ip_cliente
        assert f_log.user_agent == ua_cliente

        # Cancelamento via API
        res_cancel = self.client.post(
            f"/api/v1/schedule/agendamentos/{agendamento_id}/cancelar/",
            {"motivo": "Demanda reorganizada para sprint futura com novo escopo acordado."},
            format="json",
            REMOTE_ADDR="198.51.100.88",
            HTTP_USER_AGENT="SHM-Frontend/2.5 (Chrome/130)",
        )
        assert res_cancel.status_code == status.HTTP_200_OK

        tl_cancel = TimelineEvent.objects.filter(
            agendamento_id=agendamento_id,
            tipo=TipoEventoTimeline.AGENDAMENTO_CANCELADO,
        ).first()
        assert tl_cancel is not None
        assert tl_cancel.ip_origem == "198.51.100.88"
        assert tl_cancel.user_agent == "SHM-Frontend/2.5 (Chrome/130)"

    def test_agendamento_avulso_sem_pedido_gera_auditoria_particao_cliente(self):
        """
        Valida que agendamentos avulsos (sem chamado/pedido vinculado) são pericialmente
        auditados na partição pericial do cliente (`cliente:{id}`), com escrita reflexa em ClienteAuditLog.
        """
        agendamento = ScheduleService.criar_agendamento(
            cliente=self.cliente,
            organizador=self.tecnico,
            titulo="Reunião Geral de Relacionamento Comercial",
            data_inicio=timezone.now() + timedelta(days=5),
            tipo=TipoEventoSchedule.AVULSO,
            sincronizar_google=False,
            ip_origem="201.50.60.70",
            user_agent="CommercialAgent/1.0",
        )

        particao_esperada = f"cliente:{self.cliente.id}"
        f_log = ForensicAuditLog.objects.filter(
            particao=particao_esperada,
            tipo_evento="SCHEDULE_AGENDAMENTO_CRIADO",
        ).first()
        assert f_log is not None
        assert f_log.ip_origem == "201.50.60.70"
        assert f_log.cliente == self.cliente

        # Escrita dupla reflexa no ClienteAuditLog
        cli_audit = ClienteAuditLog.objects.filter(cliente_id=self.cliente.id).first()
        assert cli_audit is not None
        assert "Reunião Geral" in cli_audit.descricao

        # Integridade da partição do cliente
        verif = ForensicAuditService.verificar_integridade_particao(particao_esperada)
        assert verif["status"] == "integro"
