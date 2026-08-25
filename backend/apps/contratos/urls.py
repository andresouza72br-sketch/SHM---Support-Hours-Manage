from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.contratos.views import ContratoViewSet, AceiteContratoView

router = DefaultRouter()
router.register(r"", ContratoViewSet, basename="contratos")

urlpatterns = [
    path("aceite/<uuid:token>/", AceiteContratoView.as_view(), name="contrato_aceite"),
] + router.urls