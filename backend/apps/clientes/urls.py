from rest_framework.routers import DefaultRouter
from apps.clientes.views import ClienteViewSet

router = DefaultRouter()
router.register(r"", ClienteViewSet, basename="clientes")

urlpatterns = router.urls