from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.ciclos.views import CicloViewSet, MagicLinkCicloView

router = DefaultRouter()
router.register(r"", CicloViewSet, basename="ciclos")

urlpatterns = [
    path("publico/<uuid:token>/", MagicLinkCicloView.as_view(), name="ciclo_magic_link"),
] + router.urls