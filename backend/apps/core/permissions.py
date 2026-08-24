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
            (request.user.role == "CLIENTE_GERENTE" or request.user.is_superuser)
        )

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if request.user.role == "CLIENTE_GERENTE":
            pedido = getattr(obj, "pedido", None) or (obj if hasattr(obj, "cliente_id") else None)
            if pedido:
                return request.user.cliente_id == pedido.cliente_id
            return True
        return False

class IsClienteUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and 
            request.user.role in ("CLIENTE_GERENTE", "CLIENTE_ANALISTA")
        )