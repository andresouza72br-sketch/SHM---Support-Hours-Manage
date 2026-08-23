from decimal import Decimal

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404, redirect, render

from shm.models.clients import Cliente
from shm.models.contracts import Contrato
from shm.services.contract_service import ContractService


@login_required
def contract_list_view(request):
    user = request.user
    if user.is_cliente:
        contratos = Contrato.objects.filter(cliente=user.cliente).order_by(
            "-data_inicio"
        )
    else:
        contratos = (
            Contrato.objects.all().select_related("cliente").order_by("-data_inicio")
        )

    return render(request, "contracts/contract_list.html", {"contratos": contratos})


@login_required
def contract_create_view(request):
    user = request.user
    if user.tipo_perfil != user.TipoPerfil.ADMIN_EMPRESA:
        raise PermissionDenied("Apenas o Administrador da Empresa pode cadastrar novos contratos.")

    if request.method == "POST":
        cliente_id = request.POST.get("cliente_id")
        numero_contrato = request.POST.get("numero_contrato", "").strip()
        data_inicio = request.POST.get("data_inicio")
        data_fim = request.POST.get("data_fim")
        horas_contratadas = Decimal(request.POST.get("horas_contratadas", "0.00"))
        horas_herdadas = Decimal(request.POST.get("horas_herdadas", "0.00") or "0.00")
        limite_rollover_dias = int(request.POST.get("limite_rollover_dias", 30))
        status = request.POST.get("status", Contrato.Status.ATIVO)
        observacoes = request.POST.get("observacoes", "").strip()

        cliente = get_object_or_404(Cliente, id=cliente_id)

        try:
            contrato = Contrato.objects.create(
                cliente=cliente,
                numero_contrato=numero_contrato,
                data_inicio=data_inicio,
                data_fim=data_fim,
                horas_contratadas=horas_contratadas,
                horas_herdadas=horas_herdadas,
                limite_rollover_dias=limite_rollover_dias,
                status=status,
                observacoes=observacoes,
            )
            messages.success(request, f"Contrato {contrato.numero_contrato} cadastrado com sucesso para {cliente.nome_fantasia}!")
            return redirect("contract_detail", contract_id=contrato.id)
        except Exception as e:
            messages.error(request, f"Erro ao cadastrar contrato: {e}")

    clientes = Cliente.objects.filter(ativo=True).order_by("nome_fantasia")
    return render(request, "contracts/contract_create.html", {"clientes": clientes})


@login_required
def contract_detail_view(request, contract_id):
    user = request.user
    if user.is_cliente:
        contrato = get_object_or_404(Contrato, id=contract_id, cliente=user.cliente)
    else:
        contrato = get_object_or_404(Contrato, id=contract_id)

    pedidos = contrato.pedidos.prefetch_related("ciclos").order_by("-created_at")
    transferencias_saida = contrato.transferencias_saida.all()
    transferencias_entrada = contrato.transferencias_entrada.all()

    return render(
        request,
        "contracts/contract_detail.html",
        {
            "contrato": contrato,
            "pedidos": pedidos,
            "transferencias_saida": transferencias_saida,
            "transferencias_entrada": transferencias_entrada,
        },
    )


@login_required
def transferir_saldo_view(request):
    user = request.user
    if not user.is_empresa:
        raise PermissionDenied("Apenas administradores podem transferir saldos.")

    if request.method == "POST":
        origem_id = request.POST.get("contrato_origem")
        destino_id = request.POST.get("contrato_destino")
        motivo = request.POST.get("motivo", "")

        contrato_origem = get_object_or_404(Contrato, id=origem_id)
        contrato_destino = get_object_or_404(Contrato, id=destino_id)

        try:
            ContractService.transferir_saldo(
                contrato_origem=contrato_origem,
                contrato_destino=contrato_destino,
                usuario=user,
                motivo=motivo,
            )
            messages.success(request, "Transferência de saldo realizada com sucesso!")
            return redirect("contract_detail", contract_id=contrato_destino.id)
        except ValidationError as e:
            messages.error(request, str(e.message if hasattr(e, "message") else e))

    contratos_encerrados = Contrato.objects.filter(status=Contrato.Status.VENCIDO)
    contratos_ativos = Contrato.objects.filter(status=Contrato.Status.ATIVO)
    return render(
        request,
        "contracts/transferir_saldo.html",
        {
            "contratos_origem": contratos_encerrados,
            "contratos_destino": contratos_ativos,
        },
    )
