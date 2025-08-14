from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Payment
from .serializers import PaymentSerializer
from users.permissions import IsWorkerOrAdmin

class PaymentViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite la gestión de pagos.
    """
    queryset = Payment.objects.all().select_related('lote', 'recorded_by', 'lote__owner')
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkerOrAdmin]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Filtros por lote_id y método de pago
    filterset_fields = ['lote__id', 'method']
    
    # Búsqueda por número de recibo o notas
    search_fields = ['receipt_number', 'notes', 'lote__owner__first_name', 'lote__owner__last_name']
    
    # Ordenación
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-payment_date']

    def get_serializer_context(self):
        return {'request': self.request}