from rest_framework import serializers
from apps.accounts.models import User, UserRole

class UserSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "telefone",
            "cliente",
            "cliente_nome",
            "is_staff",
            "is_active",
        ]
        read_only_fields = ["id", "is_staff", "is_active"]

    def get_cliente_nome(self, obj):
        return str(obj.cliente) if obj.cliente else None

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=6)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "role",
            "telefone",
            "cliente",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user