import pytest
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.contratos.models import Contrato, StatusContrato, ContratoAuditLog, TipoEventoContratoAudit
from apps.saldo.models import HistoricoSaldo, TipoOperacaoSaldo, TransferenciaSaldo
from apps.saldo.services import SaldoService

@pytest.mark.django_db
class TestMigracaoSaldoContratos:
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin_migracao",
            password="password123",
            role=UserRole.EMPRESA_ADMIN,
            is_staff=True,
        )
        self.cliente_a = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="Cliente Alfa Ltda",
            cnpj="11111111000100",
            email_contato="alfa@cliente.com",
        )
        self.cliente_b = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="Cliente Beta SA",
            cnpj="22222222000100",
            email_contato="beta@cliente.com",
        )
        self.gerente_a = User.objects.create_user(
            username="gerente_alfa",
            password="password123",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente_a,
        )

        hoje = timezone.localdate()
        # Contrato Expirado com Saldo
        self.contrato_expirado = Contrato.objects.create(
            numero="CT-2025-001",
            cliente=self.cliente_a,
            data_inicio=hoje - timedelta(days=400),
            data_termino=hoje - timedelta(days=35),
            data_fim_carencia=hoje - timedelta(days=5),
            horas_contratadas=Decimal("100.00"),
            saldo=Decimal("15.50"),
            horas_consumidas=Decimal("84.50"),
            status=StatusContrato.EXPIRADO,
            criado_por=self.admin,
        )

        # Contrato Concluído com Saldo
        self.contrato_concluido = Contrato.objects.create(
            numero="CT-2025-002",
            cliente=self.cliente_a,
            data_inicio=hoje - timedelta(days=300),
            data_termino=hoje - timedelta(days=60),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("8.00"),
            status=StatusContrato.CONCLUIDO,
            criado_por=self.admin,
        )

        # Contrato Ativo Destino (Novo)
        self.contrato_novo = Contrato.objects.create(
            numero="CT-2026-001",
            cliente=self.cliente_a,
            data_inicio=hoje,
            data_termino=hoje + timedelta(days=365),
            horas_contratadas=Decimal("60.00"),
            saldo=Decimal("60.00"),
            horas_consumidas=Decimal("0.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )

        # Contrato Expirado Sem Saldo (Zerado)
        self.contrato_sem_saldo = Contrato.objects.create(
            numero="CT-2025-003",
            cliente=self.cliente_a,
            data_inicio=hoje - timedelta(days=200),
            data_termino=hoje - timedelta(days=20),
            horas_contratadas=Decimal("20.00"),
            saldo=Decimal("0.00"),
            status=StatusContrato.EXPIRADO,
            criado_por=self.admin,
        )

        # Contrato Cliente B
        self.contrato_cliente_b = Contrato.objects.create(
            numero="CT-B-2026",
            cliente=self.cliente_b,
            data_inicio=hoje,
            horas_contratadas=Decimal("30.00"),
            saldo=Decimal("30.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )

    def test_contratos_elegiveis_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/v1/saldo/contratos_elegiveis/?cliente_id={self.cliente_a.id}&destino_id={self.contrato_novo.id}")
        assert res.status_code == 200
        ids = [item["id"] for item in res.data]
        # Deve conter CT-2025-001 (saldo 15.50) e CT-2025-002 (saldo 8.00)
        assert self.contrato_expirado.id in ids
        assert self.contrato_concluido.id in ids
        # Não deve conter contrato com saldo zero nem o próprio destino
        assert self.contrato_sem_saldo.id not in ids
        assert self.contrato_novo.id not in ids

    def test_migracao_saldo_total_sucesso(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "contrato_origem": self.contrato_expirado.id,
            "contrato_destino": self.contrato_novo.id,
            "motivo": "Renovação contratual anual 2026",
        }
        res = self.client.post("/api/v1/saldo/migrar/", payload, format="json")
        assert res.status_code == 200
        assert res.data["quantidade"] == "15.50"
        assert res.data["saldo_origem"] == "0.00"
        assert res.data["saldo_destino"] == "75.50"

        # Verificar integridade no banco de dados
        self.contrato_expirado.refresh_from_db()
        self.contrato_novo.refresh_from_db()
        assert self.contrato_expirado.saldo == Decimal("0.00")
        assert self.contrato_novo.saldo == Decimal("75.50")

        # Verificar lançamentos no ledger de saldo
        historicos_origem = HistoricoSaldo.objects.filter(contrato=self.contrato_expirado)
        assert historicos_origem.filter(tipo_operacao=TipoOperacaoSaldo.TRANSFERENCIA_ENVIO, quantidade=Decimal("-15.50")).exists()

        historicos_destino = HistoricoSaldo.objects.filter(contrato=self.contrato_novo)
        assert historicos_destino.filter(tipo_operacao=TipoOperacaoSaldo.TRANSFERENCIA_RECEBIMENTO, quantidade=Decimal("15.50")).exists()

        # Verificar auditoria em ambos os contratos
        assert ContratoAuditLog.objects.filter(contrato=self.contrato_expirado, tipo_evento=TipoEventoContratoAudit.ALTERACAO).exists()
        assert ContratoAuditLog.objects.filter(contrato=self.contrato_novo, tipo_evento=TipoEventoContratoAudit.ALTERACAO).exists()

    def test_migracao_saldo_parcial_sucesso(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "contrato_origem": self.contrato_expirado.id,
            "contrato_destino": self.contrato_novo.id,
            "quantidade": "10.00",
            "motivo": "Aproveitamento de 10 horas acordadas",
        }
        res = self.client.post("/api/v1/saldo/migrar/", payload, format="json")
        assert res.status_code == 200
        assert res.data["quantidade"] == "10.00"
        assert res.data["saldo_origem"] == "5.50"
        assert res.data["saldo_destino"] == "70.00"

        self.contrato_expirado.refresh_from_db()
        self.contrato_novo.refresh_from_db()
        assert self.contrato_expirado.saldo == Decimal("5.50")
        assert self.contrato_novo.saldo == Decimal("70.00")

    def test_migracao_saldo_bloqueia_clientes_diferentes(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "contrato_origem": self.contrato_expirado.id,
            "contrato_destino": self.contrato_cliente_b.id,
        }
        res = self.client.post("/api/v1/saldo/migrar/", payload, format="json")
        assert res.status_code == 400

    def test_migracao_saldo_bloqueia_saldo_insuficiente(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "contrato_origem": self.contrato_expirado.id,
            "contrato_destino": self.contrato_novo.id,
            "quantidade": "50.00",
        }
        res = self.client.post("/api/v1/saldo/migrar/", payload, format="json")
        assert res.status_code == 400

    def test_migracao_saldo_bloqueia_sem_saldo(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "contrato_origem": self.contrato_sem_saldo.id,
            "contrato_destino": self.contrato_novo.id,
        }
        res = self.client.post("/api/v1/saldo/migrar/", payload, format="json")
        assert res.status_code == 400

    def test_migracao_saldo_bloqueia_mesmo_contrato(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "contrato_origem": self.contrato_novo.id,
            "contrato_destino": self.contrato_novo.id,
        }
        res = self.client.post("/api/v1/saldo/migrar/", payload, format="json")
        assert res.status_code == 400

    def test_migracao_saldo_permissao_negada_para_cliente(self):
        self.client.force_authenticate(user=self.gerente_a)
        payload = {
            "contrato_origem": self.contrato_expirado.id,
            "contrato_destino": self.contrato_novo.id,
        }
        res = self.client.post("/api/v1/saldo/migrar/", payload, format="json")
        assert res.status_code == 403
