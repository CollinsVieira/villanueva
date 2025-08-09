from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'users'

urlpatterns = [
    # Autenticación
    path('login/', views.LoginView.as_view(), name='login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Usuario actual
    path('me/', views.me_view, name='me'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('reset-password/', views.PasswordResetView.as_view(), name='reset_password'),
    
    # Gestión de usuarios (solo admin)
    path('', views.UserListView.as_view(), name='user_list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user_detail'),
] 