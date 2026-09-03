from rest_framework.routers import DefaultRouter
from apps.notificacoes.views import NotificationViewSet, TimelineViewSet, ConfiguracaoNotificacaoViewSet

router = DefaultRouter()
router.register(r"notificacoes", NotificationViewSet, basename="notificacoes")
router.register(r"timeline", TimelineViewSet, basename="timeline")
router.register(r"configuracoes-notificacoes", ConfiguracaoNotificacaoViewSet, basename="configuracoes-notificacoes")

urlpatterns = router.urls