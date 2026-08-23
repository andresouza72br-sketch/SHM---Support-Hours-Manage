from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from shm.models.contracts import Contrato
from shm.models.requests import Pedido
from shm.services.workflow_service import WorkflowService


@login_required
def request_list_view(request):
    user = request.user
    if user.is_cliente:
        pedidos = (
            Pedido.objects.filter(cliente=user.cliente)
            .prefetch_related("ciclos")
            .order_by("-created_at")
        )
    else:
        pedidos = (
            Pedido.objects.all()
            .select_related("cliente", "contrato", "solicitante")
            .prefetch_related("ciclos")
            .order_by("-created_at")
        )

    return render(request, "requests/request_list.html", {"pedidos": pedidos})


@login_required
def request_create_view(request):
    user = request.user
    if request.method == "POST":
        titulo = request.POST.get("titulo", "").strip()
        descricao = request.POST.get("descricao_geral", "").strip()

        if user.is_cliente:
            cliente = user.cliente
            contrato = Contrato.objects.filter(
                cliente=cliente, status=Contrato.Status.ATIVO
            ).first()
            if not contrato:
                # Se não houver contrato ativo, pega o mais recente
                contrato = (
                    Contrato.objects.filter(cliente=cliente)
                    .order_by("-data_inicio")
                    .first()
                )
        else:
            cliente_id = request.POST.get("cliente_id")
            cliente = get_object_or_404(Contrato, id=cliente_id).cliente
            contrato_id = request.POST.get("contrato_id")
            contrato = get_object_or_404(Contrato, id=contrato_id)

        if not contrato:
            messages.error(
                request, "Não há contrato disponível para vincular este pedido."
            )
            return redirect("request_create")

        pedido = WorkflowService.criar_pedido(
            cliente=cliente,
            contrato=contrato,
            solicitante=user,
            titulo=titulo,
            descricao_geral=descricao,
        )
        messages.success(request, f"Pedido {pedido.codigo} registrado com sucesso!")
        return redirect("request_detail", request_id=pedido.id)

    contrato_ativo = None
    if user.is_cliente:
        contrato_ativo = Contrato.objects.filter(
            cliente=user.cliente, status=Contrato.Status.ATIVO
        ).first()

    return render(
        request, "requests/request_create.html", {"contrato_ativo": contrato_ativo}
    )


@login_required
def request_detail_view(request, request_id):
    user = request.user
    if user.is_cliente:
        pedido = get_object_or_404(Pedido, id=request_id, cliente=user.cliente)
    else:
        pedido = get_object_or_404(Pedido, id=request_id)

    ciclos = pedido.ciclos.prefetch_related("tarefas", "timeline").all()
    timeline = pedido.timeline.all()

    return render(
        request,
        "requests/request_detail.html",
        {
            "pedido": pedido,
            "ciclos": ciclos,
            "timeline": timeline,
        },
    )
