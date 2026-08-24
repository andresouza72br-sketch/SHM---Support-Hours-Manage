import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente
from apps.contratos.models import Contrato, StatusContrato
from apps.pedidos.models import Pedido, PrioridadePedido, StatusPedido
from apps.ciclos.models import Ciclo, StatusCiclo, TipoCiclo
from apps.comunicacao.models import Comentario

@pytest.mark.django_db
class TestComentariosEPermissoes:
    def setup_method(self):
        self.client = APIClient()

        # Empresa users
        self.admin = User.objects.create_user(
            username="admin_test",
            password="password123",
            role=UserRole.EMPRESA_ADMIN,
            first_name="Carlos",
            last_name="Admin",
            is_staff=True,
        )
        self.tecnico = User.objects.create_user(
            username="tecnico_test",
            password="password123",
            role=UserRole.EMPRESA_TECNICO,
            first_name="Marcos",
            last_name="Tecnico",
            is_staff=True,
        )

        # Client mkt-dnb
        self.cliente_mktdnb = Cliente.objects.create(
            tipo=TipoCliente.PJ,
            razao_social="MKT-DNB Soluções Digitais Ltda",
            nome_fantasia="mkt-dnb",
            cnpj="11223344000199",
            email_contato="contato@mkt-dnb.com",
        )

        # Client users
        self.gerente_mktdnb = User.objects.create_user(
            username="gerente.mktdnb",
            password="password123",
            role=UserRole.CLIENTE_GERENTE,
            first_name="Marcelo",
            last_name="Gerente",
            cliente=self.cliente_mktdnb,
        )
        self.analista_mktdnb = User.objects.create_user(
            username="analista.mktdnb",
            password="password123",
            role=UserRole.CLIENTE_ANALISTA,
            first_name="Fernanda",
            last_name="Analista",
            cliente=self.cliente_mktdnb,
        )

        # Contract 100h
        self.contrato = Contrato.objects.create(
            numero="CT-2026-MKTDNB",
            cliente=self.cliente_mktdnb,
            data_inicio=timezone.localdate(),
            horas_contratadas=Decimal("100.00"),
            saldo=Decimal("100.00"),
            status=StatusContrato.ATIVO,
            criado_por=self.admin,
        )

        # Pedido & Ciclo
        self.pedido = Pedido.objects.create(
            protocolo="OS2026080003",
            cliente=self.cliente_mktdnb,
            contrato=self.contrato,
            assunto="Configuração de Landing Page e Webhooks",
            descricao="Integração de leads com CRM e automação de marketing.",
            prioridade=PrioridadePedido.ALTA,
            criado_por=self.gerente_mktdnb,
        )
        self.ciclo = Ciclo.objects.create(
            pedido=self.pedido,
            tipo=TipoCiclo.CORRETIVA,
            contexto="Ajustes nos webhooks de conversão e rastreamento.",
            operador=self.tecnico,
            horas_estimadas=Decimal("10.00"),
            status=StatusCiclo.AGUARDANDO_APROVACAO,
        )

    def test_todos_usuarios_podem_comentar(self):
        # 1. Gerente do cliente cria comentário
        self.client.force_authenticate(user=self.gerente_mktdnb)
        res1 = self.client.post("/api/v1/comunicacao/comentarios/", {
            "ciclo": self.ciclo.id,
            "texto": "Comentário do Gerente Marcelo: Favor priorizar os webhooks de pagamento.",
        })
        assert res1.status_code == 201
        assert res1.data["autor"] == self.gerente_mktdnb.id
        assert res1.data["autor_username"] == "gerente.mktdnb"

        # 2. Analista do cliente cria comentário
        self.client.force_authenticate(user=self.analista_mktdnb)
        res2 = self.client.post("/api/v1/comunicacao/comentarios/", {
            "ciclo": self.ciclo.id,
            "texto": "Comentário da Analista Fernanda: Os payloads de teste foram enviados.",
        })
        assert res2.status_code == 201

        # 3. Técnico da empresa cria comentário
        self.client.force_authenticate(user=self.tecnico)
        res3 = self.client.post("/api/v1/comunicacao/comentarios/", {
            "ciclo": self.ciclo.id,
            "texto": "Comentário do Técnico Marcos: Recebido, iniciando análise da rota de callback.",
        })
        assert res3.status_code == 201

        # 4. Todos os usuários visualizam todos os 3 comentários
        self.client.force_authenticate(user=self.analista_mktdnb)
        res_list = self.client.get(f"/api/v1/comunicacao/comentarios/?ciclo={self.ciclo.id}")
        assert res_list.status_code == 200
        results = res_list.data.get("results", res_list.data) if isinstance(res_list.data, dict) else res_list.data
        assert len(results) == 3

    def test_apenas_o_dono_pode_editar_seu_comentario(self):
        # Gerente cria comentário
        self.client.force_authenticate(user=self.gerente_mktdnb)
        res_create = self.client.post("/api/v1/comunicacao/comentarios/", {
            "ciclo": self.ciclo.id,
            "texto": "Texto original do Gerente",
        })
        assert res_create.status_code == 201
        comentario_id = res_create.data["id"]

        # Outro usuário (Técnico) tenta editar -> Deve ser 403 Forbidden
        self.client.force_authenticate(user=self.tecnico)
        res_edit_negado = self.client.patch(f"/api/v1/comunicacao/comentarios/{comentario_id}/", {
            "texto": "Tentativa de alteração não autorizada pelo Técnico",
        })
        assert res_edit_negado.status_code == 403

        # Outro usuário (Analista do mesmo cliente) tenta editar -> Deve ser 403 Forbidden
        self.client.force_authenticate(user=self.analista_mktdnb)
        res_edit_analista_negado = self.client.patch(f"/api/v1/comunicacao/comentarios/{comentario_id}/", {
            "texto": "Tentativa de alteração pela Analista",
        })
        assert res_edit_analista_negado.status_code == 403

        # O próprio Gerente (Autor) edita -> Deve ser 200 OK
        self.client.force_authenticate(user=self.gerente_mktdnb)
        res_edit_sucesso = self.client.patch(f"/api/v1/comunicacao/comentarios/{comentario_id}/", {
            "texto": "Texto atualizado pelo próprio Gerente com sucesso!",
        })
        assert res_edit_sucesso.status_code == 200
        assert res_edit_sucesso.data["texto"] == "Texto atualizado pelo próprio Gerente com sucesso!"

    def test_apenas_o_dono_pode_excluir_seu_comentario(self):
        # Técnico cria comentário
        self.client.force_authenticate(user=self.tecnico)
        res_create = self.client.post("/api/v1/comunicacao/comentarios/", {
            "ciclo": self.ciclo.id,
            "texto": "Comentário do Técnico para exclusão",
        })
        assert res_create.status_code == 201
        comentario_id = res_create.data["id"]

        # Gerente do cliente tenta excluir -> Deve ser 403 Forbidden
        self.client.force_authenticate(user=self.gerente_mktdnb)
        res_del_negado = self.client.delete(f"/api/v1/comunicacao/comentarios/{comentario_id}/")
        assert res_del_negado.status_code == 403

        # O próprio Técnico (Autor) exclui -> Deve ser 204 No Content
        self.client.force_authenticate(user=self.tecnico)
        res_del_sucesso = self.client.delete(f"/api/v1/comunicacao/comentarios/{comentario_id}/")
        assert res_del_sucesso.status_code == 204

        # Verifica se o comentário não existe mais
        assert not Comentario.objects.filter(id=comentario_id).exists()

    def test_qualquer_comentario_notifica_todos_empresa_e_cliente(self):
        from apps.notificacoes.models import Notification

        # 1. Técnico (Empresa) comenta -> Notifica Gerente, Analista (Cliente) e Admin (Empresa)
        Notification.objects.all().delete()
        self.client.force_authenticate(user=self.tecnico)
        res_emp = self.client.post("/api/v1/comunicacao/comentarios/", {
            "ciclo": self.ciclo.id,
            "texto": "Mensagem técnica de alinhamento.",
        })
        assert res_emp.status_code == 201

        notifs_gerente = Notification.objects.filter(usuario=self.gerente_mktdnb)
        notifs_analista = Notification.objects.filter(usuario=self.analista_mktdnb)
        notifs_admin = Notification.objects.filter(usuario=self.admin)
        notifs_tecnico = Notification.objects.filter(usuario=self.tecnico)

        assert notifs_gerente.exists()
        assert notifs_analista.exists()
        assert notifs_admin.exists()
        assert not notifs_tecnico.exists()  # Autor não se autonotifica
        assert "Empresa" in notifs_gerente.first().mensagem
        assert notifs_gerente.first().url == f"/pedidos/{self.pedido.id}"

        # 2. Cliente (Gerente) comenta -> Notifica Analista (Cliente), Técnico e Admin (Empresa)
        Notification.objects.all().delete()
        self.client.force_authenticate(user=self.gerente_mktdnb)
        res_cli = self.client.post("/api/v1/comunicacao/comentarios/", {
            "ciclo": self.ciclo.id,
            "texto": "Resposta do cliente aprovando a abordagem.",
        })
        assert res_cli.status_code == 201

        notifs_analista_2 = Notification.objects.filter(usuario=self.analista_mktdnb)
        notifs_emp_tecnico = Notification.objects.filter(usuario=self.tecnico)
        notifs_emp_admin = Notification.objects.filter(usuario=self.admin)
        notifs_cli_gerente = Notification.objects.filter(usuario=self.gerente_mktdnb)

        assert notifs_analista_2.exists()
        assert notifs_emp_tecnico.exists()
        assert notifs_emp_admin.exists()
        assert not notifs_cli_gerente.exists()  # Autor não se autonotifica
        assert "mkt-dnb" in notifs_emp_tecnico.first().mensagem or "Marcelo" in notifs_emp_tecnico.first().mensagem

    def test_aprovacoes_e_aceites_notificam_todos_menos_autor(self):
        from apps.notificacoes.models import Notification, TimelineEvent, TipoEventoTimeline

        # 1. Técnico apresenta orçamento -> Notifica Gerente, Analista e Admin; NÃO notifica Técnico
        Notification.objects.all().delete()
        TimelineEvent.objects.all().delete()
        self.client.force_authenticate(user=self.tecnico)
        res_apres = self.client.post(f"/api/v1/ciclos/{self.ciclo.id}/apresentar_orcamento/", {
            "horas_estimadas": "8.00",
        })
        assert res_apres.status_code == 200

        assert Notification.objects.filter(usuario=self.gerente_mktdnb).exists()
        assert Notification.objects.filter(usuario=self.analista_mktdnb).exists()
        assert Notification.objects.filter(usuario=self.admin).exists()
        assert not Notification.objects.filter(usuario=self.tecnico).exists()
        assert TimelineEvent.objects.filter(tipo=TipoEventoTimeline.ORCAMENTO_APRESENTADO).exists()

        # 2. Gerente do Cliente aprova orçamento -> Notifica Técnico, Admin e Analista; NÃO notifica Gerente
        Notification.objects.all().delete()
        TimelineEvent.objects.all().delete()
        self.client.force_authenticate(user=self.gerente_mktdnb)
        res_aprov = self.client.post(f"/api/v1/ciclos/{self.ciclo.id}/aprovar/")
        assert res_aprov.status_code == 200

        assert Notification.objects.filter(usuario=self.tecnico).exists()
        assert Notification.objects.filter(usuario=self.admin).exists()
        assert Notification.objects.filter(usuario=self.analista_mktdnb).exists()
        assert not Notification.objects.filter(usuario=self.gerente_mktdnb).exists()
        assert TimelineEvent.objects.filter(tipo=TipoEventoTimeline.ORCAMENTO_APROVADO).exists()

        # 3. Técnico inicia execução
        self.client.force_authenticate(user=self.tecnico)
        self.client.post(f"/api/v1/ciclos/{self.ciclo.id}/iniciar_execucao/")

        # 4. Técnico solicita aceite -> Notifica Gerente, Analista e Admin; NÃO notifica Técnico
        Notification.objects.all().delete()
        TimelineEvent.objects.all().delete()
        res_solic = self.client.post(f"/api/v1/ciclos/{self.ciclo.id}/solicitar_aceite/")
        assert res_solic.status_code == 200

        assert Notification.objects.filter(usuario=self.gerente_mktdnb).exists()
        assert Notification.objects.filter(usuario=self.analista_mktdnb).exists()
        assert Notification.objects.filter(usuario=self.admin).exists()
        assert not Notification.objects.filter(usuario=self.tecnico).exists()
        assert TimelineEvent.objects.filter(tipo=TipoEventoTimeline.ACEITE_SOLICITADO).exists()

        # 5. Gerente do Cliente concede aceite final -> Notifica Técnico, Admin e Analista; NÃO notifica Gerente
        Notification.objects.all().delete()
        TimelineEvent.objects.all().delete()
        self.client.force_authenticate(user=self.gerente_mktdnb)
        res_aceite = self.client.post(f"/api/v1/ciclos/{self.ciclo.id}/aceitar/")
        assert res_aceite.status_code == 200

        assert Notification.objects.filter(usuario=self.tecnico).exists()
        assert Notification.objects.filter(usuario=self.admin).exists()
        assert Notification.objects.filter(usuario=self.analista_mktdnb).exists()
        assert not Notification.objects.filter(usuario=self.gerente_mktdnb).exists()
        assert TimelineEvent.objects.filter(tipo=TipoEventoTimeline.CICLO_ACEITO).exists()

