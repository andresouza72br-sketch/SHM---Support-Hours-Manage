from django.urls import path
from apps.contratos.views import PainelIntegridadeAuditoriaView

urlpatterns = [
    path("painel_integridade/", PainelIntegridadeAuditoriaView.as_view(), name="auditoria_painel_integridade"),
]
