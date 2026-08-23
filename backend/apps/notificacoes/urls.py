from rest_framework.routers import DefaultRouter
from apps.notificacoes.views import NotificationViewSet, TimelineViewSet

router = DefaultRouter()
router.register(r"notificacoes", NotificationViewSet, basename="notificacoes")
router.register(r"timeline", TimelineViewSet, basename="timeline")

urlpatterns = router.urls