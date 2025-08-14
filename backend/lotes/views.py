from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Lote
from .serializers import LoteSerializer
from users.permissions import IsWorkerOrAdmin

class LoteViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite la gestión de lotes.
    - Accesible por 'Trabajadores' y 'Administradores'.
    - Búsqueda por manzana y número de lote.
    - Filtro por estado del lote.
    - Ordenación por precio, área y fecha de creación.
    """
    queryset = Lote.objects.all().select_related('owner', 'created_by')
    serializer_class = LoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkerOrAdmin]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Filtros
    filterset_fields = ['status', 'block']
    
    # Búsqueda
    search_fields = ['block', 'lot_number', 'owner__first_name', 'owner__last_name']
    
    # Ordenación
    ordering_fields = ['price', 'area', 'created_at']
    ordering = ['block', 'lot_number']

    def get_serializer_context(self):
        return {'request': self.request}