from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, UserProfileView, UserListView,
    DocumentListCreateView, DocumentDetailView,
    AddAuthorizedSignerView, SignDocumentView, VerifyDocumentView
)

urlpatterns = [
    # Auth Endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    path('users/', UserListView.as_view(), name='user_list'),

    # Document Endpoints
    path('documents/', DocumentListCreateView.as_view(), name='document_list_create'),
    path('documents/<int:pk>/', DocumentDetailView.as_view(), name='document_detail'),
    path('documents/<int:pk>/authorize/', AddAuthorizedSignerView.as_view(), name='add_authorized_signer'),
    path('documents/<int:pk>/sign/', SignDocumentView.as_view(), name='sign_document'),
    path('documents/<int:pk>/verify/', VerifyDocumentView.as_view(), name='verify_document'),
]
