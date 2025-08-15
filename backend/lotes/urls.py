from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoteViewSet

router = DefaultRouter()
router.register(r'', LoteViewSet, basename='lote')

urlpatterns = [
    path('', include(router.urls)),
]