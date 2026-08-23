from rest_framework.routers import DefaultRouter
from apps.contratos.views import ContratoViewSet

router = DefaultRouter()
router.register(r"", ContratoViewSet, basename="contratos")

urlpatterns = router.urls