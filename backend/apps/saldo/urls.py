from rest_framework.routers import DefaultRouter
from apps.saldo.views import SaldoViewSet

router = DefaultRouter()
router.register(r"", SaldoViewSet, basename="saldo")

urlpatterns = router.urls