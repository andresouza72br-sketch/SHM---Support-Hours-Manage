from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from apps.clientes.models import Cliente
from apps.clientes.serializers import ClienteSerializer
from apps.core.permissions import IsEmpresaAdmin, IsEmpresaUser, IsClienteGerente

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsEmpresaAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_empresa:
            return Cliente.objects.all()
        if user.cliente_id:
            return Cliente.objects.filter(id=user.cliente_id)
        return Cliente.objects.none()

    @action(detail=True, methods=["post", "patch"], parser_classes=[MultiPartParser, FormParser, JSONParser], url_path="atualizar_perfil")
    def atualizar_perfil(self, request, pk=None):
        cliente = self.get_object()

        # Permissão: Empresa Admin OU Gerente da própria empresa cliente
        is_cliente_gerente = (
            request.user.role == "CLIENTE_GERENTE" and request.user.cliente_id == cliente.id
        )
        if not (request.user.is_empresa or request.user.is_superuser or is_cliente_gerente):
            raise PermissionDenied("Apenas o Administrador da Empresa ou o Gerente da conta podem alterar as informações de contato e logo.")

        # Atualização de campos seguros de contato
        if "email_contato" in request.data:
            cliente.email_contato = request.data.get("email_contato")
        if "telefone" in request.data:
            cliente.telefone = request.data.get("telefone")
        if "pessoa_contato" in request.data:
            cliente.pessoa_contato = request.data.get("pessoa_contato")

        if "emails_notificacao_padrao" in request.data:
            emails = request.data.get("emails_notificacao_padrao")
            if isinstance(emails, list):
                cliente.emails_notificacao_padrao = emails

        # Upload de logo
        if "logo" in request.FILES:
            logo_file = request.FILES["logo"]
            if logo_file.size > 5 * 1024 * 1024:
                raise ValidationError({"logo": "A imagem da logo não pode exceder 5MB."})
            cliente.logo = logo_file

        cliente.save()
        serializer = self.get_serializer(cliente)
        return Response({
            "detail": "Informações e logo da empresa atualizadas com sucesso!",
            "cliente": serializer.data,
        })