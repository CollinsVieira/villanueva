from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.core.exceptions import ValidationError
from .models import Venta
from .serializers import VentaSerializer, VentaSummarySerializer
from users.permissions import IsWorkerOrAdmin
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _

from .models import Venta
from .serializers import (
    VentaSerializer, VentaCreateSerializer, VentaUpdateSerializer, VentaSummarySerializer,
    VentaCancelSerializer, VentaCompleteSerializer, InitialPaymentSerializer
)


class VentaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para manejar las operaciones CRUD de Ventas y acciones del ciclo de vida.
    """
    queryset = Venta.objects.all().select_related('lote', 'customer')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'lote__block', 'customer']
    search_fields = ['id', 'lote__block', 'lote__lot_number', 'customer__first_name', 'customer__last_name', 'customer__document_number']
    ordering_fields = ['sale_date', 'sale_price', 'created_at']
    ordering = ['-sale_date']
    
    def get_serializer_class(self):
        """Seleccionar el serializer apropiado según la acción"""
        if self.action == 'create':
            return VentaCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return VentaUpdateSerializer
        elif self.action == 'list':
            return VentaSummarySerializer
        elif self.action in ['cancel_sale', 'complete_sale', 'register_initial_payment']:
            return self.get_action_serializer_class()
        return VentaSerializer
    
    def get_action_serializer_class(self):
        """Obtener serializer específico para acciones"""
        action_serializers = {
            'cancel_sale': VentaCancelSerializer,
            'complete_sale': VentaCompleteSerializer,
            'register_initial_payment': InitialPaymentSerializer,
        }
        return action_serializers.get(self.action, VentaSerializer)
    
    def get_queryset(self):
        """Filtrar queryset según parámetros"""
        queryset = super().get_queryset()
        
        # Filtro por estado activo
        if self.request.query_params.get('active_only'):
            queryset = queryset.filter(status='active')
        
        # Filtro por lote específico
        lote_id = self.request.query_params.get('lote')
        if lote_id:
            queryset = queryset.filter(lote_id=lote_id)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def cancel_sale(self, request, pk=None):
        """Cancelar una venta activa"""
        venta = self.get_object()
        
        if venta.status != 'active':
            return Response(
                {'error': _('Solo se pueden cancelar ventas activas')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = VentaCancelSerializer(data=request.data)
        if serializer.is_valid():
            try:
                venta.cancel_sale(
                    reason=serializer.validated_data['reason'],
                    user=request.user
                )
                return Response(
                    {'message': _('Venta cancelada exitosamente')},
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def complete_sale(self, request, pk=None):
        """Completar una venta activa"""
        venta = self.get_object()
        
        if venta.status != 'active':
            return Response(
                {'error': _('Solo se pueden completar ventas activas')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = VentaCompleteSerializer(data=request.data)
        if serializer.is_valid():
            try:
                venta.complete_sale(user=request.user)
                
                # Agregar notas si se proporcionaron
                notes = serializer.validated_data.get('notes')
                if notes:
                    venta.notes = f"{venta.notes}\n{notes}" if venta.notes else notes
                    venta.save()
                
                return Response(
                    {'message': _('Venta completada exitosamente')},
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def register_initial_payment(self, request, pk=None):
        """Registrar el pago inicial para una venta"""
        venta = self.get_object()
        
        if venta.status != 'active':
            return Response(
                {'error': _('Solo se pueden registrar pagos para ventas activas')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = InitialPaymentSerializer(data=request.data)
        if serializer.is_valid():
            try:
                payment = venta.register_initial_payment(
                    amount=serializer.validated_data['amount'],
                    payment_method=serializer.validated_data.get('payment_method', 'transferencia'),
                    receipt_number=serializer.validated_data.get('receipt_number'),
                    receipt_date=serializer.validated_data.get('receipt_date'),
                    payment_date=serializer.validated_data.get('payment_date'),
                    receipt_image=serializer.validated_data.get('receipt_image'),
                    notes=serializer.validated_data.get('notes'),
                    recorded_by=request.user
                )
                
                return Response(
                    {
                        'message': _('Pago inicial registrado exitosamente'),
                        'payment_id': payment.id
                    },
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def payment_schedule(self, request, pk=None):
        """Obtener el cronograma de pagos de una venta"""
        venta = self.get_object()
        
        # Importar aquí para evitar imports circulares
        from payments.serializers import PaymentScheduleSummarySerializer
        
        schedules = venta.payment_schedules.all().order_by('installment_number')
        serializer = PaymentScheduleSummarySerializer(schedules, many=True)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def payment_plan(self, request, pk=None):
        """Obtener el plan de pagos de una venta"""
        venta = self.get_object()
        
        if not hasattr(venta, 'plan_pagos'):
            return Response(
                {'error': _('Esta venta no tiene un plan de pagos asociado')},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Importar aquí para evitar imports circulares
        from payments.serializers import PaymentPlanSerializer
        
        serializer = PaymentPlanSerializer(venta.plan_pagos)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active_sales(self, request):
        """Obtener todas las ventas activas"""
        active_sales = self.get_queryset().filter(status='active')
        serializer = VentaSummarySerializer(active_sales, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def sales_by_lote(self, request):
        """Obtener el historial de ventas por lote"""
        lote_id = request.query_params.get('lote_id')
        if not lote_id:
            return Response(
                {'error': _('Se requiere el parámetro lote_id')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sales = self.get_queryset().filter(lote_id=lote_id).order_by('-sale_date')
        serializer = VentaSummarySerializer(sales, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def regenerate_payment_schedule(self, request, pk=None):
        """Regenera el cronograma de pagos cuando cambia el payment_day"""
        venta = self.get_object()
        
        if venta.status != 'active':
            return Response(
                {'error': _('Solo se puede regenerar el cronograma para ventas activas')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            schedules = venta.regenerate_payment_schedule()
            
            # Importar aquí para evitar imports circulares
            from payments.serializers import PaymentScheduleSummarySerializer
            
            serializer = PaymentScheduleSummarySerializer(schedules, many=True)
            
            return Response({
                'message': _('Cronograma de pagos regenerado exitosamente'),
                'schedules': serializer.data
            }, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': _('Error al regenerar el cronograma de pagos')},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
