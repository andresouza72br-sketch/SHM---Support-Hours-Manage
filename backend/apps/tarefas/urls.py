from rest_framework.routers import DefaultRouter
from apps.tarefas.views import TarefaViewSet

router = DefaultRouter()
router.register(r"", TarefaViewSet, basename="tarefas")

urlpatterns = router.urls