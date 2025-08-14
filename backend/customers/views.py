from django.shortcuts import render

from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customer
from .serializers import CustomerSerializer
from users.permissions import IsWorkerOrAdmin

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