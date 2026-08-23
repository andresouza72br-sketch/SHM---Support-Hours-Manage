from decimal import Decimal

from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from shm.models.contracts import Contrato
from shm.models.requests import Ciclo, Pedido


@login_required
def dashboard_view(request):
    user = request.user
    if user.is_cliente:
        # Dashboard do Cliente
        cliente = user.cliente
        contratos = Contrato.objects.filter(cliente=cliente).order_by("-data_inicio")
        contrato_ativo = contratos.filter(status=Contrato.Status.ATIVO).first()

        pedidos_recentes = Pedido.objects.filter(cliente=cliente).order_by(
            "-created_at"
        )[:5]
        ciclos_aguardando_aprovacao = Ciclo.objects.filter(
            pedido__cliente=cliente, status=Ciclo.Status.AGUARDANDO_APROVACAO
        )
        ciclos_aguardando_aceite = Ciclo.objects.filter(
            pedido__cliente=cliente, status=Ciclo.Status.AGUARDANDO_ACEITE
        )
        ciclos_em_execucao = Ciclo.objects.filter(
            pedido__cliente=cliente, status=Ciclo.Status.EM_EXECUCAO
        )

        context = {
            "cliente": cliente,
            "contrato_ativo": contrato_ativo,
            "contratos": contratos,
            "pedidos_recentes": pedidos_recentes,
            "ciclos_aguardando_aprovacao": ciclos_aguardando_aprovacao,
            "ciclos_aguardando_aceite": ciclos_aguardando_aceite,
            "ciclos_em_execucao": ciclos_em_execucao,
        }
        return render(request, "dashboards/cliente_dashboard.html", context)
    else:
        # Dashboard da Empresa Prestadora
        contratos_ativos = Contrato.objects.filter(status=Contrato.Status.ATIVO)
        total_horas_contratadas = sum(
            (c.total_horas_disponiveis for c in contratos_ativos), Decimal("0.00")
        )
        total_horas_consumidas = sum(
            (c.horas_consumidas for c in contratos_ativos), Decimal("0.00")
        )

        pedidos_pendentes = Pedido.objects.filter(
            status__in=[Pedido.Status.ABERTO, Pedido.Status.EM_ANALISE]
        )
        ciclos_aprovacao = Ciclo.objects.filter(
            status=Ciclo.Status.AGUARDANDO_APROVACAO
        )
        ciclos_aceite = Ciclo.objects.filter(status=Ciclo.Status.AGUARDANDO_ACEITE)
        ciclos_execucao = Ciclo.objects.filter(status=Ciclo.Status.EM_EXECUCAO)

        context = {
            "contratos_ativos": contratos_ativos,
            "total_horas_contratadas": total_horas_contratadas,
            "total_horas_consumidas": total_horas_consumidas,
            "saldo_global": total_horas_contratadas - total_horas_consumidas,
            "pedidos_pendentes": pedidos_pendentes,
            "ciclos_aprovacao": ciclos_aprovacao,
            "ciclos_aceite": ciclos_aceite,
            "ciclos_execucao": ciclos_execucao,
        }
        return render(request, "dashboards/empresa_dashboard.html", context)
