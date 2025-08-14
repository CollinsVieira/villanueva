from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet

# Creamos un router para registrar automáticamente las URLs del ViewSet
router = DefaultRouter()
router.register(r'', CustomerViewSet, basename='customer')

# Las URLs de la API son generadas automáticamente por el router.
urlpatterns = [
    path('', include(router.urls)),
]