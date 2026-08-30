import os
import sys
from decimal import Decimal
from datetime import timedelta
from pathlib import Path

# Configuração do caminho do Django
BASE_DIR = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.core.files.base import ContentFile
from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.clientes.models import Cliente, TipoCliente, StatusCliente
from apps.contratos.models import (
    Contrato,
    StatusContrato,
    TipoContrato,
    ContratoDocumento,
    ContratoAuditLog,
    TipoEventoContratoAudit,
    TipoDocumentoContrato,
)
from apps.core.utils import calcular_hash_sha256
from apps.pedidos.models import Pedido, StatusPedido, PrioridadePedido
from apps.ciclos.models import Ciclo, TipoCiclo, StatusCiclo, CicloMagicLink, TipoAcaoMagicLink
from apps.tarefas.models import Tarefa, StatusTarefa
from apps.saldo.models import HistoricoSaldo, TipoOperacaoSaldo
from apps.comunicacao.models import Comentario
from apps.notificacoes.models import Notification, TimelineEvent, TipoEventoTimeline


if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def seed_base_limpa():
    print("==================================================================")
    print("  [SHM 2.4] Semeando Base de Testes Limpa e Deterministica")
    print("==================================================================")

    # -------------------------------------------------------------------------
    # 1. USUARIOS DA EMPRESA & CLIENTES (Perfis Corporativos Oficiais)
    # -------------------------------------------------------------------------
    print("\n[1/5] Criando 4 Usuarios Oficiais...")

    # Empresa Admin
    admin_user = User.objects.create(
        username="admin",
        email="admin@shm.local",
        first_name="Admin",
        last_name="SHM",
        role=UserRole.EMPRESA_ADMIN,
        is_staff=True,
        is_superuser=True,
        is_active=True,
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=admin@shm.local",
    )
    admin_user.set_password("admin123")
    admin_user.save()
    print("  [OK] [EMPRESA_ADMIN]    admin / admin123 (admin@shm.local)")

    # Empresa Tecnico
    tecnico_user = User.objects.create(
        username="tecnico",
        email="tecnico@shm.local",
        first_name="Tecnico",
        last_name="SHM",
        role=UserRole.EMPRESA_TECNICO,
        is_staff=False,
        is_superuser=False,
        is_active=True,
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=tecnico@shm.local",
    )
    tecnico_user.set_password("tecnico123")
    tecnico_user.save()
    print("  [OK] [EMPRESA_TECNICO]  tecnico / tecnico123 (tecnico@shm.local)")

    # -------------------------------------------------------------------------
    # 2. CLIENTE B2B
    # -------------------------------------------------------------------------
    print("\n[2/5] Criando Cliente B2B Modelo...")
    cliente_acme = Cliente.objects.create(
        cnpj="12345678000195",
        tipo=TipoCliente.PJ,
        razao_social="Acme Industria e Comercio S/A",
        nome_fantasia="Acme Corp",
        email_contato="contato@acme.com",
        telefone="(11) 98765-4321",
        pessoa_contato="Carlos Silva (Gestor)",
        cidade="Sao Paulo",
        estado="SP",
        status=StatusCliente.ATIVO,
    )
    print(f"  [OK] Cliente: {cliente_acme.nome_fantasia} (CNPJ: {cliente_acme.cnpj})")

    # Cliente Gerente (Aprovador)
    gerente_acme = User.objects.create(
        username="cligerente",
        email="gerente@acme.com",
        first_name="Carlos",
        last_name="Silva (Gestor Acme)",
        role=UserRole.CLIENTE_GERENTE,
        cliente=cliente_acme,
        is_staff=False,
        is_superuser=False,
        is_active=True,
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=gerente@acme.com",
    )
    gerente_acme.set_password("cliente123")
    gerente_acme.save()
    print("  [OK] [CLIENTE_GERENTE]  cligerente / cliente123 (gerente@acme.com)")

    # Cliente Analista (Operacional)
    analista_acme = User.objects.create(
        username="clianalista",
        email="analista@acme.com",
        first_name="Mariana",
        last_name="Lima (Analista Acme)",
        role=UserRole.CLIENTE_ANALISTA,
        cliente=cliente_acme,
        is_staff=False,
        is_superuser=False,
        is_active=True,
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=analista@acme.com",
    )
    analista_acme.set_password("cliente123")
    analista_acme.save()
    print("  [OK] [CLIENTE_ANALISTA] clianalista / cliente123 (analista@acme.com)")

    # -------------------------------------------------------------------------
    # 3. CONTRATO ATIVO (100H) & INTEGRIDADE FORENSE SHA-256
    # -------------------------------------------------------------------------
    print("\n[3/5] Criando Contrato Oficial de Suporte...")
    hoje = timezone.localdate()
    contrato_acme = Contrato.objects.create(
        numero="CT-2026-0001",
        tipo=TipoContrato.NOVO,
        cliente=cliente_acme,
        data_inicio=hoje - timedelta(days=30),
        data_termino=hoje + timedelta(days=335),
        horas_contratadas=Decimal("100.00"),
        saldo=Decimal("100.00"),
        horas_consumidas=Decimal("0.00"),
        status=StatusContrato.ATIVO,
        descricao_servicos="Suporte N2/N3 especializado em Infraestrutura, Backend Python/Django e Banco de Dados.",
        valor_mensal=Decimal("5000.00"),
        dia_faturamento=10,
        gestor_nome="Carlos Silva (Gestor Acme)",
        gestor_email="gerente@acme.com",
        gestor_telefone="(11) 98765-4321",
        emails_notificacao=[
            {"email": "gerente@acme.com", "nome": "Carlos Silva (Gerente)", "ativo": True},
            {"email": "analista@acme.com", "nome": "Mariana Lima (Analista)", "ativo": True},
        ],
        criado_por=admin_user,
    )

    # Criação do documento anexo assinado e cálculo do hash SHA-256
    doc_conteudo = b"%PDF-1.4 Mock PDF Contrato Assinado Acme Corp 2026 - Franquia 100 Horas Tecnicas SHM"
    doc_anexo = ContratoDocumento.objects.create(
        contrato=contrato_acme,
        nome_original="Contrato_Prestacao_Servicos_Acme_2026.pdf",
        tipo_documento=TipoDocumentoContrato.CONTRATO_ASSINADO,
        tamanho_bytes=len(doc_conteudo),
        algoritmo_hash="SHA-256",
        enviado_por=admin_user,
    )
    doc_anexo.arquivo.save("Contrato_Prestacao_Servicos_Acme_2026.pdf", ContentFile(doc_conteudo), save=False)
    doc_anexo.hash_sha256 = calcular_hash_sha256(doc_anexo.arquivo)
    doc_anexo.save()

    # Registros de Auditoria Forense
    ContratoAuditLog.objects.create(
        contrato=contrato_acme,
        tipo_evento=TipoEventoContratoAudit.CRIACAO,
        descricao=f"Contrato {contrato_acme.numero} cadastrado por {admin_user.get_full_name()} com franquia de 100.00h.",
        usuario=admin_user,
        ip_origem="127.0.0.1",
        user_agent="SHM Seed Script 2.4",
    )
    ContratoAuditLog.objects.create(
        contrato=contrato_acme,
        tipo_evento=TipoEventoContratoAudit.UPLOAD_DOCUMENTO,
        descricao=f"Upload do documento '{doc_anexo.nome_original}' (Contrato Assinado).",
        documento_nome=doc_anexo.nome_original,
        documento_hash=doc_anexo.hash_sha256,
        usuario=admin_user,
        ip_origem="127.0.0.1",
        user_agent="SHM Seed Script 2.4",
    )

    # Registro no Ledger Contabil (HistoricoSaldo)
    HistoricoSaldo.objects.create(
        contrato=contrato_acme,
        tipo_operacao=TipoOperacaoSaldo.REABASTECIMENTO,
        quantidade=Decimal("100.00"),
        saldo_resultante=Decimal("100.00"),
        autor=admin_user,
        descricao="Carga inicial da franquia contratual (100.00h).",
        metodo_aprovacao="SISTEMA",
        ip_origem="127.0.0.1",
        user_agent="SHM Seed Script 2.4",
    )
    print(f"  [OK] Contrato: {contrato_acme.numero} (Franquia: 100h | SHA-256: {doc_anexo.hash_sha256[:16]}...)")

    # -------------------------------------------------------------------------
    # 4. TRES CHAMADOS ESTRATEGICOS (100% dos fluxos de teste)
    # -------------------------------------------------------------------------
    print("\n[4/5] Criando 3 Chamados Estruturados...")

    # --- OS 01: Pronto para Aceite Final (A3: Debito de 6h no Ledger) ---
    pedido1 = Pedido.objects.create(
        protocolo="OS2026080001",
        cliente=cliente_acme,
        contrato=contrato_acme,
        assunto="Otimizacao de indices e lentidao no banco de dados",
        descricao="Consultas do fechamento mensal demoravam mais de 10 segundos. Necessaria analise e reindexacao.",
        prioridade=PrioridadePedido.ALTA,
        status=StatusPedido.AGUARDANDO_ACEITE,
        criado_por=gerente_acme,
    )

    ciclo1 = Ciclo.objects.create(
        pedido=pedido1,
        tipo=TipoCiclo.CORRETIVA,
        contexto="Otimizacao de indices e refatoracao de queries pesadas no PostgreSQL.",
        operador=tecnico_user,
        status=StatusCiclo.AGUARDANDO_ACEITE,
        horas_estimadas=Decimal("8.00"),
        horas_realizadas=Decimal("6.00"),
        apresentado_em=timezone.now() - timedelta(days=2),
        aprovado_em=timezone.now() - timedelta(days=2),
        aprovado_por=gerente_acme,
        aprovado_metodo="APP",
    )

    # Tarefas Realizadas
    Tarefa.objects.create(
        ciclo=ciclo1,
        descricao="Analise dos logs de slow query e plano de execucao (EXPLAIN ANALYZE)",
        horas_estimadas=Decimal("2.00"),
        horas_realizadas=Decimal("2.00"),
        status=StatusTarefa.REALIZADA,
        operador=tecnico_user,
    )
    Tarefa.objects.create(
        ciclo=ciclo1,
        descricao="Criacao de indices parciais e reescrita das queries de relatorios",
        horas_estimadas=Decimal("6.00"),
        horas_realizadas=Decimal("4.00"),
        status=StatusTarefa.REALIZADA,
        operador=tecnico_user,
    )

    # Magic Link para Aceite Final
    ml_aceite = CicloMagicLink.objects.create(
        ciclo=ciclo1,
        tipo_acao=TipoAcaoMagicLink.ACEITE_CICLO,
        expira_em=timezone.now() + timedelta(days=7),
        usado=False,
    )

    Comentario.objects.create(
        ciclo=ciclo1,
        autor=tecnico_user,
        texto="Execucao concluida! As queries foram otimizadas e o tempo caiu de 12s para 180ms. Solicito o aceite para debitar as 6.00h.",
    )
    Comentario.objects.create(
        ciclo=ciclo1,
        autor=gerente_acme,
        texto="Validado pela equipe contabil. Pronto para o aceite formal.",
    )

    Notification.objects.create(
        usuario=gerente_acme,
        titulo="Aceite Solicitado: Ciclo #OS2026080001 (6.00h)",
        mensagem="O tecnico Marcos finalizou a execucao e solicitou o aceite formal de 6.00h.",
        url=f"/pedidos/{pedido1.id}",
        lida=False,
    )

    TimelineEvent.objects.create(
        pedido=pedido1,
        ciclo=ciclo1,
        tipo=TipoEventoTimeline.ACEITE_SOLICITADO,
        descricao="Aceite formal de 6.00h solicitado pelo tecnico",
        autor=tecnico_user,
    )
    print(f"  [OK] OS 01: {pedido1.protocolo} [AGUARDANDO_ACEITE] -> Magic Link Token: {ml_aceite.token}")

    # --- OS 02: Pronto para Aprovacao de Orcamento (A2: Estimado 8h) ---
    pedido2 = Pedido.objects.create(
        protocolo="OS2026080002",
        cliente=cliente_acme,
        contrato=contrato_acme,
        assunto="Configuracao de Webhooks e Integracao de Notificacoes",
        descricao="Integracao de notificacoes em tempo real e webhooks seguros com retries automaticos.",
        prioridade=PrioridadePedido.MEDIA,
        status=StatusPedido.AGUARDANDO_APROVACAO,
        criado_por=analista_acme,
    )

    ciclo2 = Ciclo.objects.create(
        pedido=pedido2,
        tipo=TipoCiclo.EVOLUTIVA,
        contexto="Implementacao do middleware de webhooks seguros com validacao HMAC.",
        operador=tecnico_user,
        status=StatusCiclo.AGUARDANDO_APROVACAO,
        horas_estimadas=Decimal("8.00"),
        horas_realizadas=Decimal("0.00"),
        apresentado_em=timezone.now() - timedelta(hours=3),
    )

    Tarefa.objects.create(
        ciclo=ciclo2,
        descricao="Desenho dos esquemas JSON e validacao de seguranca HMAC",
        horas_estimadas=Decimal("2.00"),
        status=StatusTarefa.PREVISTA,
        operador=tecnico_user,
    )
    Tarefa.objects.create(
        ciclo=ciclo2,
        descricao="Implementacao dos endpoints e testes automatizados",
        horas_estimadas=Decimal("6.00"),
        status=StatusTarefa.PREVISTA,
        operador=tecnico_user,
    )

    # Magic Link para Aprovacao de Orcamento
    ml_orcamento = CicloMagicLink.objects.create(
        ciclo=ciclo2,
        tipo_acao=TipoAcaoMagicLink.APROVACAO_ORCAMENTO,
        expira_em=timezone.now() + timedelta(days=7),
        usado=False,
    )

    Notification.objects.create(
        usuario=gerente_acme,
        titulo="Orcamento Emitido: Ciclo #OS2026080002 (8.00h)",
        mensagem="Orcamento de 8.00h apresentado para aprovacao.",
        url=f"/pedidos/{pedido2.id}",
        lida=False,
    )

    TimelineEvent.objects.create(
        pedido=pedido2,
        ciclo=ciclo2,
        tipo=TipoEventoTimeline.ORCAMENTO_APRESENTADO,
        descricao="Orcamento de 8.00h apresentado para aprovacao do cliente",
        autor=tecnico_user,
    )
    print(f"  [OK] OS 02: {pedido2.protocolo} [AGUARDANDO_APROVACAO] -> Magic Link Token: {ml_orcamento.token}")

    # --- OS 03: Chamado Aberto (Inicio do Ciclo de Vida) ---
    pedido3 = Pedido.objects.create(
        protocolo="OS2026080003",
        cliente=cliente_acme,
        contrato=contrato_acme,
        assunto="Duvida tecnica sobre regras de rate-limit da API",
        descricao="Precisamos de orientacoes tecnicas para dimensionar as chamadas da API REST do ERP.",
        prioridade=PrioridadePedido.MEDIA,
        status=StatusPedido.ABERTO,
        criado_por=analista_acme,
    )

    TimelineEvent.objects.create(
        pedido=pedido3,
        tipo=TipoEventoTimeline.PEDIDO_CRIADO,
        descricao="Chamado aberto pela analista da Acme Corp",
        autor=analista_acme,
    )

    Notification.objects.create(
        usuario=admin_user,
        titulo="Novo Chamado Aberto: OS2026080003",
        mensagem="Novo chamado aberto por Acme Corp para triagem.",
        url=f"/pedidos/{pedido3.id}",
        lida=False,
    )
    Notification.objects.create(
        usuario=tecnico_user,
        titulo="Novo Chamado Aberto: OS2026080003",
        mensagem="Novo chamado aberto por Acme Corp para triagem.",
        url=f"/pedidos/{pedido3.id}",
        lida=False,
    )
    print(f"  [OK] OS 03: {pedido3.protocolo} [ABERTO] (Pronto para orcamento/triagem)")

    print("\n[5/5] Base Limpa Semeada com 100% de Sucesso!")
    print("==================================================================")


if __name__ == "__main__":
    seed_base_limpa()
