from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, PaymentScheduleViewSet

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'schedules', PaymentScheduleViewSet, basename='paymentschedule')

urlpatterns = [
    path('', include(router.urls)),
]