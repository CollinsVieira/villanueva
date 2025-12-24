from django.urls import path
from .views import DashboardSummaryView

urlpatterns = [
    # Al ser una APIView, usamos .as_view()
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
]