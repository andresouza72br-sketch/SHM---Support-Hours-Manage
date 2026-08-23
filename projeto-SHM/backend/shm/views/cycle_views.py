from decimal import Decimal

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import get_object_or_404, render

from shm.models.requests import Ciclo, Pedido, Tarefa
from shm.services.timeline_service import TimelineService
from shm.services.workflow_service import WorkflowService


@login_required
def cycle_create_view(request, request_id):
    """Cria um novo ciclo dentro do pedido."""
    user = request.user
    pedido = get_object_or_404(Pedido, id=request_id)

    if request.method == "POST":
        titulo_contexto = request.POST.get("titulo_contexto", "").strip()
        tipo_manutencao = request.POST.get(
            "tipo_manutencao", Ciclo.TipoManutencao.CORRETIVA
        )
        descricao_escopo = request.POST.get("descricao_escopo", "").strip()
        tarefas_desc = request.POST.getlist("tarefa_desc[]")
        tarefas_horas = request.POST.getlist("tarefa_horas[]")

        tarefas_data = []
        for d, h in zip(tarefas_desc, tarefas_horas, strict=False):
            if d.strip():
                tarefas_data.append(
                    {"descricao": d.strip(), "horas_estimadas": h or "0.00"}
                )

        ciclo = WorkflowService.decompor_pedido_em_ciclo(
            pedido=pedido,
            usuario=user,
            titulo_contexto=titulo_contexto,
            tipo_manutencao=tipo_manutencao,
            descricao_escopo=descricao_escopo,
            tarefas_data=tarefas_data,
        )

        WorkflowService.enviar_orcamento(ciclo, user)

        if request.htmx:
            return render(
                request,
                "cycles/partials/cycle_card.html",
                {"ciclo": ciclo, "user": user},
            )

    return render(request, "cycles/cycle_form_modal.html", {"pedido": pedido})


@login_required
def cycle_approve_view(request, cycle_id):
    user = request.user
    ciclo = get_object_or_404(Ciclo, id=cycle_id)

    if request.method == "POST":
        WorkflowService.aprovar_orcamento(ciclo, user)
        if request.htmx:
            return render(
                request,
                "cycles/partials/cycle_card.html",
                {"ciclo": ciclo, "user": user},
            )

    return HttpResponseBadRequest("Apenas POST aceito.")


@login_required
def cycle_reject_view(request, cycle_id):
    user = request.user
    ciclo = get_object_or_404(Ciclo, id=cycle_id)

    if request.method == "POST":
        motivo = request.POST.get("motivo", "Orçamento não aprovado pelo cliente.")
        WorkflowService.rejeitar_orcamento(ciclo, user, motivo)
        if request.htmx:
            return render(
                request,
                "cycles/partials/cycle_card.html",
                {"ciclo": ciclo, "user": user},
            )

    return HttpResponseBadRequest("Apenas POST aceito.")


@login_required
def cycle_start_view(request, cycle_id):
    user = request.user
    ciclo = get_object_or_404(Ciclo, id=cycle_id)

    if request.method == "POST":
        WorkflowService.iniciar_execucao_ciclo(ciclo, user)
        if request.htmx:
            return render(
                request,
                "cycles/partials/cycle_card.html",
                {"ciclo": ciclo, "user": user},
            )

    return HttpResponseBadRequest("Apenas POST aceito.")


@login_required
def cycle_request_acceptance_view(request, cycle_id):
    user = request.user
    ciclo = get_object_or_404(Ciclo, id=cycle_id)

    if request.method == "POST":
        WorkflowService.solicitar_aceite_ciclo(ciclo, user)
        if request.htmx:
            return render(
                request,
                "cycles/partials/cycle_card.html",
                {"ciclo": ciclo, "user": user},
            )

    return HttpResponseBadRequest("Apenas POST aceito.")


@login_required
def cycle_accept_view(request, cycle_id):
    user = request.user
    ciclo = get_object_or_404(Ciclo, id=cycle_id)

    if request.method == "POST":
        WorkflowService.dar_aceite_ciclo(ciclo, user)
        if request.htmx:
            return render(
                request,
                "cycles/partials/cycle_card.html",
                {"ciclo": ciclo, "user": user},
            )

    return HttpResponseBadRequest("Apenas POST aceito.")


@login_required
def task_log_hours_view(request, cycle_id, task_id):
    user = request.user
    tarefa = get_object_or_404(Tarefa, id=task_id, ciclo_id=cycle_id)

    if request.method == "POST":
        horas = Decimal(
            request.POST.get("horas_realizadas", str(tarefa.horas_realizadas))
        )
        concluida = (
            request.POST.get("concluida") == "on"
            or request.POST.get("concluida") == "true"
        )
        WorkflowService.apontar_horas_tarefa(tarefa, user, horas, concluida)

        if request.htmx:
            return render(
                request,
                "cycles/partials/task_row.html",
                {"tarefa": tarefa, "user": user},
            )

    return render(
        request, "cycles/partials/task_row.html", {"tarefa": tarefa, "user": user}
    )


@login_required
def timeline_comment_view(request, cycle_id):
    user = request.user
    ciclo = get_object_or_404(Ciclo, id=cycle_id)

    if request.method == "POST":
        conteudo = request.POST.get("conteudo", "").strip()
        if conteudo:
            TimelineService.registrar_evento(
                conteudo=conteudo,
                ciclo=ciclo,
                autor=user,
            )
        if request.htmx:
            timeline = ciclo.timeline.all()
            return render(
                request, "cycles/partials/timeline_list.html", {"timeline": timeline}
            )

    return HttpResponse("")
