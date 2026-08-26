from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.clientes.views import ClienteViewSet, AceiteClienteView

router = DefaultRouter()
router.register(r"", ClienteViewSet, basename="clientes")

urlpatterns = [
    path("aprovacao/<uuid:token>/", AceiteClienteView.as_view(), name="cliente_aprovacao"),
    path("aceite/<uuid:token>/", AceiteClienteView.as_view(), name="cliente_aceite"),
] + router.urls