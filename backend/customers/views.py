from django.shortcuts import render
from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customer
from .serializers import CustomerSerializer, BulkCustomerCreateSerializer
from users.permissions import IsWorkerOrAdmin
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

class CustomerViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite ver, crear, editar y eliminar clientes con nueva arquitectura basada en ventas.
    - Accesible por 'Trabajadores' y 'Administradores'.
    - Permite búsqueda por nombre, apellido, email y número de documento.
    - Permite ordenar por nombre, apellido y fecha de creación.
    """
    queryset = Customer.objects.all().select_related('created_by').prefetch_related('ventas', 'ventas__lote', 'ventas__payments')
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkerOrAdmin]
    
    # Herramientas de filtrado y búsqueda
    filter_backends = [
        DjangoFilterBackend, 
        filters.SearchFilter, 
        filters.OrderingFilter
    ]

    # Campos por los que se puede filtrar (ej: /api/v1/customers/?phone=12345)
    filterset_fields = ['phone', 'document_type', 'email']
    
    # Campos por los que se puede buscar (ej: /api/v1/customers/?search=Juan)
    search_fields = ['first_name', 'last_name', 'email', 'document_number']
    
    # Campos por los que se puede ordenar (ej: /api/v1/customers/?ordering=-created_at)
    ordering_fields = ['first_name', 'last_name', 'created_at', 'total_payments', 'total_ventas_value']
    
    # Orden por defecto
    ordering = ['-created_at']

    @action(detail=True, methods=['get'])
    def sales_history(self, request, pk=None):
        """
        Devuelve el historial de ventas del cliente con información detallada.
        """
        customer = self.get_object()
        
        # Obtener todas las ventas del cliente con información relacionada
        ventas = customer.ventas.select_related('lote').prefetch_related('payments', 'payment_schedules').order_by('-sale_date')
        
        data = []
        for venta in ventas:
            venta_data = {
                'id': venta.id,
                'status': venta.status,
                'sale_price': float(venta.sale_price),
                'initial_payment': float(venta.initial_payment) if venta.initial_payment else 0,
                'sale_date': venta.sale_date,
                'contract_date': venta.contract_date,
                'remaining_balance': float(venta.remaining_balance),
                'lote': {
                    'id': venta.lote.id,
                    'block': venta.lote.block,
                    'lot_number': venta.lote.lot_number,
                    'area': venta.lote.area,
                    'display': f"Mz. {venta.lote.block} - Lt. {venta.lote.lot_number}"
                },
                'payments': [
                    {
                        'id': payment.id,
                        'amount': float(payment.amount),
                        'payment_date': payment.payment_date,
                        'method': payment.method,
                        'payment_type': payment.payment_type,
                        'receipt_number': payment.receipt_number
                    }
                    for payment in venta.payments.all()
                ],
                'payment_schedules': [
                    {
                        'id': schedule.id,
                        'installment_number': schedule.installment_number,
                        'scheduled_amount': float(schedule.scheduled_amount),
                        'paid_amount': float(schedule.paid_amount),
                        'due_date': schedule.due_date,
                        'status': schedule.status
                    }
                    for schedule in venta.payment_schedules.all()
                ]
            }
            data.append(venta_data)
        
        return Response(data)

    @action(detail=True, methods=['get'])
    def payment_summary(self, request, pk=None):
        """
        Devuelve un resumen detallado de los pagos del cliente.
        """
        customer = self.get_object()
        return Response(customer.payment_summary)

    @action(detail=False, methods=['get'])
    def with_active_sales(self, request):
        """
        Devuelve solo los clientes que tienen ventas activas.
        """
        customers = self.get_queryset().filter(ventas__status='active').distinct()
        
        # Aplicar filtros adicionales
        customers = self.filter_queryset(customers)
        
        page = self.paginate_queryset(customers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(customers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def with_overdue_payments(self, request):
        """
        Devuelve clientes que tienen pagos vencidos.
        """
        customers = self.get_queryset().filter(
            ventas__payment_schedules__status='overdue'
        ).distinct()
        
        # Aplicar filtros adicionales
        customers = self.filter_queryset(customers)
        
        page = self.paginate_queryset(customers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(customers, many=True)
        return Response(serializer.data)

    def get_serializer_context(self):
        """
        Pasa el objeto 'request' al serializador para acceder al usuario.
        """
        return {'request': self.request}

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """
        Endpoint para crear múltiples clientes en una sola petición.
        
        POST /api/v1/customers/bulk-create/
        
        Body:
        {
            "customers": [
                {
                    "first_name": "Juan",
                    "last_name": "Pérez",
                    "email": "juan@example.com",
                    "phone": "123456789",
                    "address": "Calle 123",
                    "document_type": "CC",
                    "document_number": "12345678"
                },
                {
                    "first_name": "María",
                    "last_name": "González",
                    "email": "maria@example.com",
                    "phone": "987654321",
                    "address": "Avenida 456",
                    "document_type": "CC",
                    "document_number": "87654321"
                }
            ]
        }
        """
        serializer = BulkCustomerCreateSerializer(data=request.data, context=self.get_serializer_context())
        
        if serializer.is_valid():
            result = serializer.save()
            return Response(result, status=201)
        
        return Response(serializer.errors, status=400)