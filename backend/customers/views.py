from django.shortcuts import render

from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customer
from .serializers import CustomerSerializer
from users.permissions import IsWorkerOrAdmin
from rest_framework.decorators import action # <-- Añadir import
from rest_framework.response import Response
from lotes.models import LoteHistory 

class CustomerViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite ver, crear, editar y eliminar clientes.
    - Accesible por 'Trabajadores' y 'Administradores'.
    - Permite búsqueda por nombre, apellido, email y número de documento.
    - Permite ordenar por nombre, apellido y fecha de creación.
    """
    queryset = Customer.objects.all().select_related('created_by')
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkerOrAdmin]
    
    # Herramientas de filtrado y búsqueda
    filter_backends = [
        DjangoFilterBackend, 
        filters.SearchFilter, 
        filters.OrderingFilter

        

        
    ]

    search_fields = ['first_name', 'last_name', 'document_number']

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Devuelve un historial consolidado de eventos para un cliente,
        principalmente basado en los cambios en sus lotes.
        """
        customer = self.get_object()
        # Buscamos en el historial de lotes, todos los registros de los lotes que pertenecen al cliente
        # Usamos select_related para evitar consultas N+1
        history_records = LoteHistory.objects.filter(lote__owner=customer).select_related('lote', 'user').order_by('-timestamp')
        
        # (En el futuro, aquí podrías unir historiales de otros modelos también)
        
        # Usamos un truco simple para serializar: creamos una lista de diccionarios
        data = [
            {
                "timestamp": record.timestamp,
                "action": record.action,
                "details": record.details,
                "user": record.user.get_full_name() if record.user else "Sistema",
                "lote_name": f"Mz. {record.lote.block} - Lt. {record.lote.lot_number}"
            }
            for record in history_records
        ]
        
        return Response(data)
    
    # Campos por los que se puede filtrar (ej: /api/v1/customers/?phone=12345)
    filterset_fields = ['phone', 'document_type']
    
    # Campos por los que se puede buscar (ej: /api/v1/customers/?search=Juan)
    search_fields = ['first_name', 'last_name', 'email', 'document_number']
    
    # Campos por los que se puede ordenar (ej: /api/v1/customers/?ordering=-created_at)
    ordering_fields = ['first_name', 'last_name', 'created_at']
    
    # Orden por defecto
    ordering = ['-created_at']

    def get_serializer_context(self):
        """
        Pasa el objeto 'request' al serializador para acceder al usuario.
        """
        return {'request': self.request}