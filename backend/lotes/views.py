from django.db import transaction
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from users.permissions import IsWorkerOrAdmin
from .models import Lote, LoteHistory
from .serializers import LoteSerializer


class LoteViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite la gestión de lotes con nueva arquitectura simplificada.
    - Accesible por 'Trabajadores' y 'Administradores'.
    - Búsqueda por manzana y número de lote.
    - Filtro por estado del lote.
    - Ordenación por precio, área y fecha de creación.
    - Las ventas se gestionan a través del módulo Sales.
    """
    queryset = Lote.objects.all().select_related('created_by')
    serializer_class = LoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkerOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'block']
    search_fields = ['block', 'lot_number']
    ordering_fields = ['price', 'area', 'created_at', 'block', 'lot_number']
    ordering = ['block', 'lot_number']

    def get_serializer_context(self):
        return {'request': self.request}
    
    def perform_update(self, serializer):
        # Campos que queremos monitorear para el historial
        MONITORED_FIELDS = {
            'status': 'Estado',
            'price': 'Precio',
            'area': 'Área'
        }

        # Obtenemos la instancia del lote ANTES de que se guarde el cambio
        old_instance = self.get_object()
        old_values = {field: getattr(old_instance, field) for field in MONITORED_FIELDS}

        # Guardamos la instancia actualizada
        new_instance = serializer.save()

        # Comparamos los valores antiguos y nuevos para cada campo monitoreado
        for field, name in MONITORED_FIELDS.items():
            old_value = old_values[field]
            new_value = getattr(new_instance, field)

            if old_value != new_value:
                LoteHistory.objects.create(
                    lote=new_instance,
                    user=self.request.user,
                    action=f"Cambio de {name}",
                    details=f"El {name} cambió de '{old_value}' a '{new_value}'."
                )

    @action(detail=True, methods=['get'])
    def sales_history(self, request, pk=None):
        """
        Devuelve el historial de ventas del lote.
        """
        lote = self.get_object()
        sales_history = lote.get_sales_history()
        
        data = []
        for sale in sales_history:
            sale_data = {
                'id': sale.id,
                'status': sale.status,
                'sale_price': float(sale.sale_price),
                'initial_payment': float(sale.initial_payment) if sale.initial_payment else 0,
                'sale_date': sale.sale_date,
                'contract_date': sale.contract_date,
                'remaining_balance': float(sale.remaining_balance),
                'total_payments': float(sale.total_payments),
                'payment_completion_percentage': round(sale.payment_completion_percentage, 2),
                'customer': {
                    'id': sale.customer.id,
                    'full_name': sale.customer.full_name,
                    'document_number': sale.customer.document_number,
                    'phone': sale.customer.phone,
                    'email': sale.customer.email
                } if sale.customer else None
            }
            data.append(sale_data)
        
        return Response(data)

    @action(detail=True, methods=['get'])
    def payment_history(self, request, pk=None):
        """
        Devuelve el historial de pagos del lote a través de sus ventas.
        """
        lote = self.get_object()
        payment_history = lote.get_payment_history()
        
        data = []
        for payment in payment_history:
            payment_data = {
                'id': payment.id,
                'amount': float(payment.amount),
                'payment_date': payment.payment_date,
                'method': payment.method,
                'payment_type': payment.payment_type,
                'receipt_number': payment.receipt_number,
                'receipt_date': payment.receipt_date,
                'notes': payment.notes,
                'venta': {
                    'id': payment.venta.id,
                    'status': payment.venta.status,
                    'sale_price': float(payment.venta.sale_price),
                    'sale_date': payment.venta.sale_date
                },
                'customer': {
                    'id': payment.venta.customer.id,
                    'full_name': payment.venta.customer.full_name,
                    'document_number': payment.venta.customer.document_number
                } if payment.venta.customer else None
            }
            data.append(payment_data)
        
        return Response(data)

    @action(detail=True, methods=['get'])
    def payment_schedules(self, request, pk=None):
        """
        Devuelve los cronogramas de pago del lote a través de sus ventas.
        """
        lote = self.get_object()
        payment_schedules = lote.get_payment_schedules()
        
        data = []
        for schedule in payment_schedules:
            schedule_data = {
                'id': schedule.id,
                'installment_number': schedule.installment_number,
                'scheduled_amount': float(schedule.scheduled_amount),
                'paid_amount': float(schedule.paid_amount),
                'due_date': schedule.due_date,
                'status': schedule.status,
                'payment_date': schedule.payment_date,
                'venta': {
                    'id': schedule.venta.id,
                    'status': schedule.venta.status,
                    'sale_price': float(schedule.venta.sale_price),
                    'sale_date': schedule.venta.sale_date
                },
                'customer': {
                    'id': schedule.venta.customer.id,
                    'full_name': schedule.venta.customer.full_name,
                    'document_number': schedule.venta.customer.document_number
                } if schedule.venta.customer else None
            }
            data.append(schedule_data)
        
        return Response(data)

    @action(detail=False, methods=['get'])
    def available(self, request):
        """
        Devuelve solo los lotes disponibles para venta.
        """
        available_lotes = self.get_queryset().filter(status='disponible')
        
        # Aplicar filtros adicionales
        available_lotes = self.filter_queryset(available_lotes)
        
        page = self.paginate_queryset(available_lotes)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(available_lotes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def sold(self, request):
        """
        Devuelve solo los lotes vendidos.
        """
        sold_lotes = self.get_queryset().filter(status='vendido')
        
        # Aplicar filtros adicionales
        sold_lotes = self.filter_queryset(sold_lotes)
        
        page = self.paginate_queryset(sold_lotes)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(sold_lotes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def with_active_sales(self, request):
        """
        Devuelve lotes que tienen ventas activas.
        """
        from sales.models import Venta
        
        lotes_with_sales = self.get_queryset().filter(
            ventas__status='active'
        ).distinct()
        
        # Aplicar filtros adicionales
        lotes_with_sales = self.filter_queryset(lotes_with_sales)
        
        page = self.paginate_queryset(lotes_with_sales)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(lotes_with_sales, many=True)
        return Response(serializer.data)