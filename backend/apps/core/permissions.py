from rest_framework.permissions import BasePermission

class IsEmpresaAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and 
            (request.user.role == "EMPRESA_ADMIN" or request.user.is_superuser or request.user.is_staff)
        )

class IsEmpresaUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and 
            request.user.role in ("EMPRESA_ADMIN", "EMPRESA_TECNICO") or request.user.is_staff
        )

class IsClienteGerente(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and 
            (request.user.role == "CLIENTE_GERENTE" or request.user.role == "EMPRESA_ADMIN" or request.user.is_superuser)
        )

class IsClienteUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and 
            request.user.role in ("CLIENTE_GERENTE", "CLIENTE_ANALISTA")
        )