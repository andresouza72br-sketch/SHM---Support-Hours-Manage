import io
import pytest
from decimal import Decimal
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.contratos.models import (
    Contrato,
    StatusContrato,
    TipoContrato,
    ContratoDocumento,
    ContratoAuditLog,
    TipoEventoContratoAudit,
    TipoDocumentoContrato,
)

@pytest.mark.django_db
class TestContratosFeatures:
    def setup_method(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin_contratos",
            email="admin@shm.com",
            password="password123",
            role=UserRole.EMPRESA_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        self.tecnico = User.objects.create_user(
            username="tecnico_contratos",
            email="tecnico@shm.com",
            password="password123",
            role=UserRole.EMPRESA_TECNICO,
        )
        self.cliente = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="Indústria Alpha Ltda",
            nome_fantasia="Alpha Indústria",
            cnpj="99888777000166",
            email_contato="contato@alpha.com",
            telefone="(11) 3333-4444",
        )
        self.gerente_cliente = User.objects.create_user(
            username="gerente_alpha",
            password="password123",
            role=UserRole.CLIENTE_GERENTE,
            cliente=self.cliente,
        )
        self.analista_cliente = User.objects.create_user(
            username="analista_alpha",
            password="password123",
            role=UserRole.CLIENTE_ANALISTA,
            cliente=self.cliente,
        )

    def test_empresa_admin_cria_contrato_com_sucesso(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "cliente": self.cliente.id,
            "tipo": "novo",
            "data_inicio": str(timezone.localdate()),
            "horas_contratadas": "120.00",
            "valor_mensal": "6000.00",
            "dia_faturamento": 15,
            "gestor_nome": "Carlos Gerente",
            "gestor_email": "carlos@alpha.com",
            "gestor_telefone": "(11) 9999-8888",
            "descricao_servicos": "Suporte e Consultoria Cloud 24/7",
            "emails_notificacao": [
                {"email": "carlos@alpha.com", "nome": "Carlos", "ativo": True},
                {"email": "fiscal@alpha.com", "nome": "Fiscal", "ativo": True},
            ],
        }
        res = self.client.post("/api/v1/contratos/", payload, format="json")
        assert res.status_code == 201
        contrato_id = res.data["id"]
        contrato = Contrato.objects.get(id=contrato_id)
        assert contrato.numero.startswith("CT-")
        assert contrato.saldo == Decimal("120.00")
        assert contrato.dia_faturamento == 15
        assert len(contrato.emails_notificacao) == 2

        # Audit log de criação gerado
        audit = ContratoAuditLog.objects.filter(contrato=contrato, tipo_evento=TipoEventoContratoAudit.CRIACAO).first()
        assert audit is not None
        assert audit.usuario == self.admin

    def test_cliente_e_tecnico_nao_podem_criar_contrato(self):
        # Técnico
        self.client.force_authenticate(user=self.tecnico)
        res = self.client.post("/api/v1/contratos/", {"cliente": self.cliente.id, "horas_contratadas": "50.00"})
        assert res.status_code == 403

        # Gerente Cliente
        self.client.force_authenticate(user=self.gerente_cliente)
        res = self.client.post("/api/v1/contratos/", {"cliente": self.cliente.id, "horas_contratadas": "50.00"})
        assert res.status_code == 403

    def test_contrato_nao_pode_ser_excluido_do_sistema(self):
        contrato = Contrato.objects.create(
            numero="CT-2026-TESTE-DEL",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(f"/api/v1/contratos/{contrato.id}/")
        assert res.status_code == 400
        assert "não podem ser excluídos" in str(res.data)
        assert Contrato.objects.filter(id=contrato.id).exists()

    def test_cancelamento_com_justificativa_obrigatoria(self):
        contrato = Contrato.objects.create(
            numero="CT-2026-TESTE-CANCEL",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        self.client.force_authenticate(user=self.admin)

        # Sem justificativa deve falhar
        res_sem_just = self.client.post(f"/api/v1/contratos/{contrato.id}/cancelar/", {"justificativa": ""})
        assert res_sem_just.status_code == 400

        # Com justificativa válida
        justificativa = "Encerramento amigável a pedido da diretoria após fusão empresarial."
        res = self.client.post(f"/api/v1/contratos/{contrato.id}/cancelar/", {"justificativa": justificativa})
        assert res.status_code == 200
        contrato.refresh_from_db()
        assert contrato.status == StatusContrato.CANCELADO
        assert contrato.justificativa_cancelamento == justificativa
        assert contrato.cancelado_por == self.admin
        assert contrato.cancelado_em is not None

        # Auditoria gravada
        audit = ContratoAuditLog.objects.filter(contrato=contrato, tipo_evento=TipoEventoContratoAudit.CANCELAMENTO).first()
        assert audit is not None
        assert audit.justificativa == justificativa

    def test_upload_documentos_limitado_a_5_arquivos(self):
        contrato = Contrato.objects.create(
            numero="CT-2026-DOCS-LIMIT",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        self.client.force_authenticate(user=self.admin)

        # Upload de 5 arquivos
        for i in range(1, 6):
            arquivo = SimpleUploadedFile(f"doc_{i}.pdf", b"%PDF-1.4 Mock content", content_type="application/pdf")
            res = self.client.post(
                f"/api/v1/contratos/{contrato.id}/upload_documento/",
                {"arquivo": arquivo, "tipo_documento": "proposta"},
                format="multipart",
            )
            assert res.status_code == 201

        assert contrato.documentos.count() == 5

        # 6º upload deve ser bloqueado
        arquivo_extra = SimpleUploadedFile("doc_6.pdf", b"%PDF-1.4 Mock content", content_type="application/pdf")
        res_extra = self.client.post(
            f"/api/v1/contratos/{contrato.id}/upload_documento/",
            {"arquivo": arquivo_extra, "tipo_documento": "aditivo"},
            format="multipart",
        )
        assert res_extra.status_code == 400
        assert "Limite máximo de 5 documentos" in str(res_extra.data)

    def test_download_documento_registra_auditoria_forense(self):
        contrato = Contrato.objects.create(
            numero="CT-2026-DOC-DOWN",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        doc = ContratoDocumento.objects.create(
            contrato=contrato,
            nome_original="Proposta_Alpha_2026.pdf",
            tipo_documento=TipoDocumentoContrato.PROPOSTA,
            tamanho_bytes=1200,
            enviado_por=self.admin,
        )
        doc.arquivo.save("Proposta_Alpha_2026.pdf", SimpleUploadedFile("Proposta_Alpha_2026.pdf", b"Conteudo do PDF"))

        # Download efetuado pelo Gerente do Cliente
        self.client.force_authenticate(user=self.gerente_cliente)
        res = self.client.get(f"/api/v1/contratos/{contrato.id}/documentos/{doc.id}/download/")
        assert res.status_code in (200, 302)

        # Auditoria registrada com usuário gerente_cliente
        audit = ContratoAuditLog.objects.filter(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.DOWNLOAD_DOCUMENTO,
            usuario=self.gerente_cliente,
        ).first()
        assert audit is not None
        assert audit.documento_nome == "Proposta_Alpha_2026.pdf"
        assert audit.documento_hash == doc.hash_sha256

    def test_upload_documento_calcula_hash_sha256_e_registra_auditoria(self):
        import hashlib
        contrato = Contrato.objects.create(
            numero="CT-2026-HASH-TEST",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        self.client.force_authenticate(user=self.admin)
        conteudo = b"Conteudo Criptografico de Teste do Contrato Alpha 2026"
        hash_esperado = hashlib.sha256(conteudo).hexdigest()

        arquivo = SimpleUploadedFile("Contrato_Alpha_2026.pdf", conteudo, content_type="application/pdf")
        res = self.client.post(
            f"/api/v1/contratos/{contrato.id}/upload_documento/",
            {"arquivo": arquivo, "tipo_documento": "contrato_assinado"},
            format="multipart",
        )
        assert res.status_code == 201
        assert res.data["hash_sha256"] == hash_esperado
        assert res.data["algoritmo_hash"] == "SHA-256"

        doc = ContratoDocumento.objects.get(id=res.data["id"])
        assert doc.hash_sha256 == hash_esperado
        assert doc.algoritmo_hash == "SHA-256"

        audit = ContratoAuditLog.objects.filter(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.UPLOAD_DOCUMENTO,
            documento_nome="Contrato_Alpha_2026.pdf",
        ).first()
        assert audit is not None
        assert audit.documento_hash == hash_esperado

    def test_gerente_empresa_remove_documento_com_motivo_e_registra_auditoria_forense(self):
        import hashlib
        contrato = Contrato.objects.create(
            numero="CT-2026-DEL-DOC",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        conteudo = b"Documento Para Ser Excluido com Auditoria"
        hash_esperado = hashlib.sha256(conteudo).hexdigest()
        doc = ContratoDocumento.objects.create(
            contrato=contrato,
            nome_original="Minuta_Antiga.pdf",
            tipo_documento=TipoDocumentoContrato.PROPOSTA,
            tamanho_bytes=len(conteudo),
            hash_sha256=hash_esperado,
            algoritmo_hash="SHA-256",
            enviado_por=self.admin,
        )

        self.client.force_authenticate(user=self.admin)
        motivo_teste = "Substituição por minuta revisada e assinada"
        res = self.client.delete(
            f"/api/v1/contratos/{contrato.id}/documentos/{doc.id}/",
            {"motivo": motivo_teste},
            format="json",
        )
        assert res.status_code == 200
        assert ContratoDocumento.objects.filter(id=doc.id).count() == 0

        audit = ContratoAuditLog.objects.filter(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.EXCLUSAO_DOCUMENTO,
            documento_nome="Minuta_Antiga.pdf",
        ).first()
        assert audit is not None
        assert audit.documento_hash == hash_esperado
        assert audit.justificativa == motivo_teste
        assert motivo_teste in audit.descricao
        assert audit.usuario == self.admin

    def test_remocao_documento_sem_motivo_retorna_400_bad_request(self):
        contrato = Contrato.objects.create(
            numero="CT-2026-DEL-NOMOTIVO",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        doc = ContratoDocumento.objects.create(
            contrato=contrato,
            nome_original="Doc_Teste.pdf",
            tipo_documento=TipoDocumentoContrato.OUTRO,
            tamanho_bytes=100,
            hash_sha256="abc123",
            enviado_por=self.admin,
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(
            f"/api/v1/contratos/{contrato.id}/documentos/{doc.id}/",
            {"motivo": "   "},
            format="json",
        )
        assert res.status_code == 400
        assert "motivo" in res.data
        assert ContratoDocumento.objects.filter(id=doc.id).count() == 1

    def test_tecnico_e_cliente_nao_podem_remover_documento_retorna_403_forbidden(self):
        contrato = Contrato.objects.create(
            numero="CT-2026-DEL-FORBIDDEN",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        doc = ContratoDocumento.objects.create(
            contrato=contrato,
            nome_original="Doc_Importante.pdf",
            tipo_documento=TipoDocumentoContrato.CONTRATO_ASSINADO,
            tamanho_bytes=100,
            hash_sha256="def456",
            enviado_por=self.admin,
        )

        # 1. Técnico da Empresa
        self.client.force_authenticate(user=self.tecnico)
        res_tec = self.client.delete(
            f"/api/v1/contratos/{contrato.id}/documentos/{doc.id}/",
            {"motivo": "Tentativa indevida por técnico"},
            format="json",
        )
        assert res_tec.status_code == 403

        # 2. Gerente do Cliente
        self.client.force_authenticate(user=self.gerente_cliente)
        res_cli = self.client.delete(
            f"/api/v1/contratos/{contrato.id}/documentos/{doc.id}/",
            {"motivo": "Tentativa por cliente"},
            format="json",
        )
        assert res_cli.status_code == 403
        assert ContratoDocumento.objects.filter(id=doc.id).count() == 1

    def test_verificar_integridade_documento_com_sucesso(self):
        import hashlib
        contrato = Contrato.objects.create(
            numero="CT-2026-VERIF-OK",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        conteudo = b"Minuta Imutavel do Contrato SHM 2026"
        hash_esperado = hashlib.sha256(conteudo).hexdigest()

        doc = ContratoDocumento.objects.create(
            contrato=contrato,
            nome_original="Minuta.pdf",
            tipo_documento=TipoDocumentoContrato.PROPOSTA,
            tamanho_bytes=len(conteudo),
            hash_sha256=hash_esperado,
            algoritmo_hash="SHA-256",
            enviado_por=self.admin,
        )
        doc.arquivo.save("Minuta.pdf", SimpleUploadedFile("Minuta.pdf", conteudo))

        self.client.force_authenticate(user=self.gerente_cliente)
        res = self.client.get(f"/api/v1/contratos/{contrato.id}/documentos/{doc.id}/verificar/")
        assert res.status_code == 200
        assert res.data["integro"] is True
        assert res.data["hash_registrado"] == hash_esperado
        assert res.data["hash_calculado"] == hash_esperado
        assert res.data["algoritmo"] == "SHA-256"

    def test_verificar_integridade_detecta_divergencia(self):
        contrato = Contrato.objects.create(
            numero="CT-2026-VERIF-TAMPER",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        conteudo_original = b"Conteudo Original Legitimo"
        doc = ContratoDocumento.objects.create(
            contrato=contrato,
            nome_original="Termo.pdf",
            tipo_documento=TipoDocumentoContrato.PROPOSTA,
            tamanho_bytes=len(conteudo_original),
            hash_sha256="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            algoritmo_hash="SHA-256",
            enviado_por=self.admin,
        )
        doc.arquivo.save("Termo.pdf", SimpleUploadedFile("Termo.pdf", b"Conteudo Modificado Diferente"))

        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/v1/contratos/{contrato.id}/documentos/{doc.id}/verificar/")
        assert res.status_code == 200
        assert res.data["integro"] is False
        assert res.data["hash_registrado"] != res.data["hash_calculado"]

    def test_gerente_cliente_atualiza_lista_emails_notificacao(self):
        contrato = Contrato.objects.create(
            numero="CT-2026-EMAILS",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
            emails_notificacao=[{"email": "antigo@alpha.com", "nome": "Antigo", "ativo": True}],
        )
        self.client.force_authenticate(user=self.gerente_cliente)
        novos_emails = [
            {"email": "gerencia@alpha.com", "nome": "Gerência", "ativo": True},
            {"email": "operacoes@alpha.com", "nome": "Operações", "ativo": False},
        ]
        res = self.client.post(
            f"/api/v1/contratos/{contrato.id}/atualizar_emails/",
            {"emails_notificacao": novos_emails},
            format="json",
        )
        assert res.status_code == 200
        contrato.refresh_from_db()
        assert len(contrato.emails_notificacao) == 2
        assert contrato.emails_notificacao[0]["email"] == "gerencia@alpha.com"

        # Auditoria de atualização de e-mails
        audit = ContratoAuditLog.objects.filter(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.ATUALIZACAO_EMAILS,
        ).first()
        assert audit is not None
        assert audit.usuario == self.gerente_cliente

    def test_envio_convite_confirmacao_email_com_validade_15_dias(self):
        from apps.contratos.models import ContratoEmailNotificacao, StatusConfirmacaoEmail
        from django.core import mail

        contrato = Contrato.objects.create(
            numero="CT-2026-CONFIRM-15D",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )

        self.client.force_authenticate(user=self.admin)
        emails = [{"email": "novo.fiscal@alpha.com", "nome": "Fiscal Alpha", "ativo": True}]
        res = self.client.post(
            f"/api/v1/contratos/{contrato.id}/atualizar_emails/",
            {"emails_notificacao": emails},
            format="json",
        )
        assert res.status_code == 200

        dest = ContratoEmailNotificacao.objects.filter(contrato=contrato, email="novo.fiscal@alpha.com").first()
        assert dest is not None
        assert dest.status == StatusConfirmacaoEmail.PENDENTE
        assert dest.token is not None
        assert dest.dias_restantes >= 14  # 15 dias

        # E-mail enviado na outbox do Django
        assert len(mail.outbox) > 0
        email_enviado = mail.outbox[-1]
        assert "novo.fiscal@alpha.com" in email_enviado.to
        assert "Confirmação de Notificações" in email_enviado.subject
        assert str(dest.token) in email_enviado.body or str(dest.token) in str(email_enviado.alternatives)

        # Trilha de auditoria gerada
        audit = ContratoAuditLog.objects.filter(contrato=contrato, tipo_evento=TipoEventoContratoAudit.CONVITE_EMAIL).first()
        assert audit is not None

    def test_confirmacao_publica_via_magic_link(self):
        from apps.contratos.models import ContratoEmailNotificacao, StatusConfirmacaoEmail
        from datetime import timedelta

        contrato = Contrato.objects.create(
            numero="CT-2026-PUBLIC-ML",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        dest = ContratoEmailNotificacao.objects.create(
            contrato=contrato,
            email="diretor@alpha.com",
            nome="Diretor Alpha",
            expira_em=timezone.now() + timedelta(days=15),
            convidado_por=self.admin,
        )

        # 1. Consulta pública dos dados do convite (Sem autenticação / token)
        self.client.force_authenticate(user=None)
        res_get = self.client.get(f"/api/v1/contratos/confirmar_email/{dest.token}/")
        assert res_get.status_code == 200
        assert res_get.data["email"] == "diretor@alpha.com"
        assert res_get.data["contrato_numero"] == "CT-2026-PUBLIC-ML"
        assert res_get.data["is_expirado"] is False

        # 2. Confirmação do e-mail (Sem autenticação)
        res_post = self.client.post(f"/api/v1/contratos/confirmar_email/{dest.token}/")
        assert res_post.status_code == 200
        assert res_post.data["codigo"] == "confirmado"

        dest.refresh_from_db()
        assert dest.status == StatusConfirmacaoEmail.CONFIRMADO
        assert dest.ativo is True
        assert dest.confirmado_em is not None

        # Auditoria de confirmação registrada
        audit = ContratoAuditLog.objects.filter(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.CONFIRMACAO_EMAIL,
        ).first()
        assert audit is not None

    def test_recusa_publica_via_magic_link(self):
        from apps.contratos.models import ContratoEmailNotificacao, StatusConfirmacaoEmail
        from datetime import timedelta

        contrato = Contrato.objects.create(
            numero="CT-2026-RECUSAL",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("50.00"),
            saldo=Decimal("50.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )
        dest = ContratoEmailNotificacao.objects.create(
            contrato=contrato,
            email="recusar@alpha.com",
            expira_em=timezone.now() + timedelta(days=15),
            convidado_por=self.admin,
        )

        # Recusa pública
        self.client.force_authenticate(user=None)
        res_post = self.client.post(f"/api/v1/contratos/recusar_email/{dest.token}/")
        assert res_post.status_code == 200
        assert res_post.data["codigo"] == "recusado"

        dest.refresh_from_db()
        assert dest.status == StatusConfirmacaoEmail.RECUSADO
        assert dest.ativo is False

        audit = ContratoAuditLog.objects.filter(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.RECUSA_EMAIL,
        ).first()
        assert audit is not None

    def test_envio_email_aceite_contrato_ao_criar_contrato(self):
        from apps.contratos.models import AceiteLink
        from django.core import mail

        self.client.force_authenticate(user=self.admin)
        payload = {
            "cliente": self.cliente.id,
            "tipo": "novo",
            "data_inicio": str(timezone.localdate()),
            "horas_contratadas": "80.00",
            "valor_mensal": "4500.00",
            "dia_faturamento": 10,
            "gestor_nome": "Mariana Gestora",
            "gestor_email": "mariana.gestora@alpha.com",
            "descricao_servicos": "Sustentação N2/N3 e monitoramento proativo.",
            "status": "pendente_aceite",
        }
        res = self.client.post("/api/v1/contratos/", payload, format="json")
        assert res.status_code == 201
        contrato_id = res.data["id"]
        contrato = Contrato.objects.get(id=contrato_id)
        assert contrato.status == StatusContrato.PENDENTE_ACEITE

        # Link de aceite gerado
        link = AceiteLink.objects.filter(contrato=contrato).first()
        assert link is not None
        assert link.usado is False

        # E-mail de aceite enviado estritamente e unicamente para a gestora
        assert len(mail.outbox) > 0
        emails_aceite = [m for m in mail.outbox if "mariana.gestora@alpha.com" in m.to or "Aceite do Contrato" in m.subject]
        assert len(emails_aceite) > 0
        email_aceite = emails_aceite[-1]
        assert email_aceite.to == ["mariana.gestora@alpha.com"]
        assert "Aceite do Contrato de Suporte" in email_aceite.subject
        assert str(link.token) in email_aceite.body or str(link.token) in str(email_aceite.alternatives)

    def test_aceite_publico_do_contrato_via_magic_link_e_ativacao(self):
        from apps.contratos.models import AceiteLink
        from datetime import timedelta
        from django.core import mail

        contrato = Contrato.objects.create(
            numero="CT-2026-ACCEPT-TEST",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("100.00"),
            saldo=Decimal("100.00"),
            status=StatusContrato.PENDENTE_ACEITE,
            criado_por=self.admin,
            gestor_nome="Mariana Gestora",
            gestor_email="mariana@alpha.com",
            emails_notificacao=[{"email": "fiscal.contrato@alpha.com", "nome": "Fiscal", "cargo": "Fiscal"}],
        )
        link = AceiteLink.objects.create(
            contrato=contrato,
            data_expiracao=timezone.now() + timedelta(days=30),
        )

        # Limpar outbox para teste do aceite
        mail.outbox.clear()

        # 1. Consulta pública dos dados do contrato para aceite
        self.client.force_authenticate(user=None)
        res_get = self.client.get(f"/api/v1/contratos/aceite/{link.token}/")
        assert res_get.status_code == 200
        assert res_get.data["contrato"]["numero"] == "CT-2026-ACCEPT-TEST"
        assert res_get.data["expirado"] is False
        assert res_get.data["usado"] is False

        # 2. Formalização pública do aceite (concordar com início dos trabalhos)
        res_post = self.client.post(f"/api/v1/contratos/aceite/{link.token}/")
        assert res_post.status_code == 200
        assert "formalizado com sucesso" in res_post.data["detail"]

        contrato.refresh_from_db()
        link.refresh_from_db()
        assert contrato.status == StatusContrato.ATIVO
        assert contrato.data_aceite is not None
        assert link.usado is True
        assert link.usado_em is not None

        # Auditoria de aceite registrada
        audit = ContratoAuditLog.objects.filter(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.ACEITE,
        ).first()
        assert audit is not None

        # E-mail de notificação de contrato ativado enviado para toda a Empresa e e-mails listados
        assert len(mail.outbox) > 0
        emails_ativacao = [m for m in mail.outbox if "Ativado" in m.subject]
        assert len(emails_ativacao) > 0
        email_ativacao = emails_ativacao[-1]
        assert "Ativado — Início dos Trabalhos Autorizado" in email_ativacao.subject
        # Destinatários contêm a equipe da empresa, e-mail listado de notificação e o gestor
        todos_destinatarios = [dest.lower() for dest in email_ativacao.to]
        assert self.admin.email.lower() in todos_destinatarios
        assert "fiscal.contrato@alpha.com" in todos_destinatarios
        assert "mariana@alpha.com" in todos_destinatarios

    def test_reenviar_aceite_contrato_pela_empresa_admin(self):
        from apps.contratos.models import AceiteLink
        from django.core import mail

        contrato = Contrato.objects.create(
            numero="CT-2026-RESEND-ACCEPT",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("100.00"),
            saldo=Decimal("100.00"),
            status=StatusContrato.PENDENTE_ACEITE,
            criado_por=self.admin,
            gestor_nome="Roberto Gestor",
            gestor_email="roberto@alpha.com",
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/api/v1/contratos/{contrato.id}/reenviar_aceite/")
        assert res.status_code == 200
        assert "reenviado com sucesso" in res.data["detail"]
        assert "token" in res.data

        # Verifica e-mail enviado unicamente para o gestor
        assert len(mail.outbox) > 0
        emails = [m for m in mail.outbox if "roberto@alpha.com" in m.to]
        assert len(emails) > 0
        assert emails[-1].to == ["roberto@alpha.com"]

    def test_auditar_download_e_impressao_de_relatorio(self):
        contrato = Contrato.objects.create(
            numero="CT-2026-RELATORIO-AUDIT",
            cliente=self.cliente,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("100.00"),
            saldo=Decimal("100.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )

        # 1. Auditoria executada por administrador da empresa
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f"/api/v1/contratos/{contrato.id}/auditar_relatorio/")
        assert res.status_code == 200
        assert "registrada com sucesso" in res.data["detail"]

        log = ContratoAuditLog.objects.filter(
            contrato=contrato,
            tipo_evento=TipoEventoContratoAudit.DOWNLOAD_RELATORIO,
        ).first()
        assert log is not None
        assert "Extrato-CT-2026-RELATORIO-AUDIT.pdf" in log.documento_nome
        assert log.usuario == self.admin

        # 2. Usuário de outro cliente sem acesso deve receber 403
        outro_cliente = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="Beta Indústria",
            cnpj="11222333000199",
        )
        outro_usuario = User.objects.create_user(
            username="outro_cliente",
            email="outro@beta.com",
            password="password123",
            role=UserRole.CLIENTE_GERENTE,
            cliente=outro_cliente,
        )
        self.client.force_authenticate(user=outro_usuario)
        res_outro = self.client.post(f"/api/v1/contratos/{contrato.id}/auditar_relatorio/")
        assert res_outro.status_code in (403, 404)

