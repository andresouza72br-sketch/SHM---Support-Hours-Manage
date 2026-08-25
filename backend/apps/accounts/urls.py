from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.accounts.views import (
    MeView,
    UserListCreateView,
    GoogleAuthView,
    PasswordlessRequestView,
    PasswordlessVerifyView,
)

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("google/", GoogleAuthView.as_view(), name="google_auth"),
    path("magic-link/request/", PasswordlessRequestView.as_view(), name="magic_link_request"),
    path("magic-link/verify/", PasswordlessVerifyView.as_view(), name="magic_link_verify"),
    path("me/", MeView.as_view(), name="auth_me"),
    path("users/", UserListCreateView.as_view(), name="user_list_create"),
]