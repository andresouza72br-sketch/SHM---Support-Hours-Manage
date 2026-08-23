from django.contrib.auth import views as auth_views
from django.urls import path

from .views import (
    contract_views,
    cycle_views,
    dashboard_views,
    request_views,
)

urlpatterns = [
    # Auth
    path(
        "login/",
        auth_views.LoginView.as_view(template_name="auth/login.html"),
        name="login",
    ),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    # Dashboards
    path("", dashboard_views.dashboard_view, name="dashboard"),
    # Contratos
    path("contratos/", contract_views.contract_list_view, name="contract_list"),
    path("contratos/novo/", contract_views.contract_create_view, name="contract_create"),
    path(
        "contratos/<uuid:contract_id>/",
        contract_views.contract_detail_view,
        name="contract_detail",
    ),
    path(
        "contratos/transferir-saldo/",
        contract_views.transferir_saldo_view,
        name="transferir_saldo",
    ),
    # Pedidos
    path("pedidos/", request_views.request_list_view, name="request_list"),
    path("pedidos/novo/", request_views.request_create_view, name="request_create"),
    path(
        "pedidos/<uuid:request_id>/",
        request_views.request_detail_view,
        name="request_detail",
    ),
    # Ciclos (HTMX endpoints)
    path(
        "pedidos/<uuid:request_id>/ciclos/novo/",
        cycle_views.cycle_create_view,
        name="cycle_create",
    ),
    path(
        "ciclos/<uuid:cycle_id>/aprovar/",
        cycle_views.cycle_approve_view,
        name="cycle_approve",
    ),
    path(
        "ciclos/<uuid:cycle_id>/rejeitar/",
        cycle_views.cycle_reject_view,
        name="cycle_reject",
    ),
    path(
        "ciclos/<uuid:cycle_id>/iniciar/",
        cycle_views.cycle_start_view,
        name="cycle_start",
    ),
    path(
        "ciclos/<uuid:cycle_id>/solicitar-aceite/",
        cycle_views.cycle_request_acceptance_view,
        name="cycle_request_acceptance",
    ),
    path(
        "ciclos/<uuid:cycle_id>/aceite/",
        cycle_views.cycle_accept_view,
        name="cycle_accept",
    ),
    path(
        "ciclos/<uuid:cycle_id>/tarefas/apontar/<uuid:task_id>/",
        cycle_views.task_log_hours_view,
        name="task_log_hours",
    ),
    path(
        "ciclos/<uuid:cycle_id>/comentarios/novo/",
        cycle_views.timeline_comment_view,
        name="timeline_comment",
    ),
]
