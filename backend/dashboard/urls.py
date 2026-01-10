from django.urls import path
from .views import DashboardSummaryView, AllDueDatesView

urlpatterns = [
    # Al ser una APIView, usamos .as_view()
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('due-dates/', AllDueDatesView.as_view(), name='dashboard-due-dates'),
]