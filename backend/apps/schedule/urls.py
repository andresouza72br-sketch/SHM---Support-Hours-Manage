from rest_framework.routers import DefaultRouter
from apps.schedule.views import AgendamentoViewSet

router = DefaultRouter()
router.register(r"agendamentos", AgendamentoViewSet, basename="agendamentos")

urlpatterns = router.urls
