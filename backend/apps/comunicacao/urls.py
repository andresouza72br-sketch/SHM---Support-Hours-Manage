from rest_framework.routers import DefaultRouter
from apps.comunicacao.views import ComentarioViewSet

router = DefaultRouter()
router.register(r"comentarios", ComentarioViewSet, basename="comentarios")

urlpatterns = router.urls