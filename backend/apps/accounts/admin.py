from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "email", "first_name", "last_name", "role", "cliente", "is_staff", "is_active"]
    list_filter = ["role", "is_staff", "is_superuser", "is_active", "cliente"]
    search_fields = ["username", "first_name", "last_name", "email", "telefone"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Perfil SHM", {"fields": ("role", "telefone", "cliente")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Perfil SHM", {"fields": ("role", "telefone", "cliente")}),
    )
