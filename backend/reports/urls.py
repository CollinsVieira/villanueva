from django.urls import path
from .views import (
    ReportListCreateView,
    ReportDetailView,
    generate_report,
    report_summary,
    report_types,
    download_report_pdf
)
from .dynamic_views import (
    customers_debt_live,
    payments_history_live,
    available_lots_live,
    pending_installments_live,
    sales_summary_live,
    financial_overview_live,
    monthly_collections_live
)

app_name = 'reports'

urlpatterns = [
    # CRUD de reportes (mantener para compatibilidad)
    path('', ReportListCreateView.as_view(), name='report-list-create'),
    path('<int:pk>/', ReportDetailView.as_view(), name='report-detail'),
    
    # Acciones de reportes
    path('<int:pk>/generate/', generate_report, name='generate-report'),
    path('<int:pk>/download/', download_report_pdf, name='download-report'),
    
    # Información adicional
    path('summary/', report_summary, name='report-summary'),
    path('types/', report_types, name='report-types'),
    
    # Nuevas APIs dinámicas (en tiempo real)
    path('live/customers-debt/', customers_debt_live, name='customers-debt-live'),
    path('live/payments-history/', payments_history_live, name='payments-history-live'),
    path('live/available-lots/', available_lots_live, name='available-lots-live'),
    path('live/pending-installments/', pending_installments_live, name='pending-installments-live'),
    path('live/sales-summary/', sales_summary_live, name='sales-summary-live'),
    path('live/financial-overview/', financial_overview_live, name='financial-overview-live'),
    path('live/monthly-collections/', monthly_collections_live, name='monthly-collections-live'),
]
