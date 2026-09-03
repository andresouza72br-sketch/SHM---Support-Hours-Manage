from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.contratos.views import (
    ContratoViewSet,
    AceiteContratoView,
    ConfirmarEmailNotificacaoView,
    RecusarEmailNotificacaoView,
)

router = DefaultRouter()
router.register(r"", ContratoViewSet, basename="contratos")

urlpatterns = [
    path("aceite/<uuid:token>/", AceiteContratoView.as_view(), name="contrato_aceite"),
    path("confirmar_email/<uuid:token>/", ConfirmarEmailNotificacaoView.as_view(), name="contrato_confirmar_email"),
    path("recusar_email/<uuid:token>/", RecusarEmailNotificacaoView.as_view(), name="contrato_recusar_email"),
] + router.urls