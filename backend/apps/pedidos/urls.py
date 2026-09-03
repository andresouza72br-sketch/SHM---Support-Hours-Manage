from rest_framework.routers import DefaultRouter
from apps.pedidos.views import PedidoViewSet

router = DefaultRouter()
router.register(r"", PedidoViewSet, basename="pedidos")

urlpatterns = router.urls