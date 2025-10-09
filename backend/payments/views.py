from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from django.utils import timezone
from .models import Payment, PaymentSchedule
from .serializers import PaymentSerializer, PaymentScheduleSerializer, PaymentScheduleSummarySerializer
from users.permissions import IsWorkerOrAdmin
from rest_framework.parsers import MultiPartParser, FormParser 

class PaymentViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite la gestión de pagos con nueva arquitectura basada en Venta.
    """
    queryset = Payment.objects.all().select_related('venta', 'payment_schedule', 'recorded_by', 'venta__lote', 'venta__customer')
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkerOrAdmin]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    parser_classes = [MultiPartParser, FormParser] # Para manejar la subida de archivos/imágenes
    
    # Filtros por venta_id, método de pago y tipo de pago
    filterset_fields = ['venta__id', 'method', 'payment_type']
    
    # Búsqueda por número de recibo, notas, información del cliente y lote
    search_fields = [
        'receipt_number', 
        'notes', 
        'venta__customer__first_name', 
        'venta__customer__last_name',
        'venta__customer__document_number',
        'venta__lote__block',
        'venta__lote__lot_number'
    ]
    
    # Ordenación
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-payment_date']

    def get_serializer_context(self):
        return {'request': self.request}

    @action(detail=True, methods=['post'])
    def reset(self, request, pk=None):
        """
        Restablece un pago, eliminando todos los datos relacionados y volviendo la cuota al estado pendiente.
        """
        payment = self.get_object()
        
        try:
            # Verificar si el pago tiene un cronograma asociado
            if payment.payment_schedule:
                # Restablecer el cronograma a estado pendiente
                schedule = payment.payment_schedule
                schedule.reset_payment(payment, recorded_by=request.user)
                
                # Eliminar el pago
                payment.delete()
                
                # Retornar el cronograma actualizado
                serializer = PaymentScheduleSerializer(schedule, context={'request': request})
                return Response({
                    'message': 'Pago restablecido exitosamente',
                    'schedule': serializer.data
                })
            else:
                # Si es un pago inicial, simplemente eliminarlo
                payment.delete()
                return Response({
                    'message': 'Pago inicial restablecido exitosamente'
                })
                
        except Exception as e:
            return Response(
                {'error': f'Error al restablecer el pago: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentScheduleViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite la gestión del cronograma de pagos.
    """
    queryset = PaymentSchedule.objects.all().select_related('venta', 'recorded_by', 'venta__lote', 'venta__customer')
    serializer_class = PaymentScheduleSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkerOrAdmin]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Filtros por venta_id, lote_id, customer_id, estado, número de cuota y si está perdonado
    filterset_fields = ['venta__id', 'venta__lote__id', 'venta__customer__id', 'status', 'installment_number', 'is_forgiven']
    
    # Búsqueda por información del lote o cliente
    search_fields = [
        'venta__lote__block',
        'venta__lote__lot_number',
        'venta__customer__first_name',
        'venta__customer__last_name',
        'venta__customer__document_number',
        'notes'
    ]
    
    # Ordenación
    ordering_fields = ['due_date', 'installment_number', 'scheduled_amount', 'status']
    ordering = ['venta__lote', 'installment_number']

    def get_serializer_class(self):
        """
        Usar serializer resumido para listas y completo para detalles.
        """
        if self.action == 'list':
            return PaymentScheduleSummarySerializer
        return PaymentScheduleSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    @action(detail=False, methods=['get'])
    def by_lote(self, request):
        """
        Obtiene el cronograma de pagos de un lote específico.
        Solo muestra cronogramas de ventas activas.
        """
        lote_id = request.query_params.get('lote_id')
        if not lote_id:
            return Response(
                {'error': 'lote_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar solo por ventas activas del lote
        schedules = self.get_queryset().filter(
            venta__lote_id=lote_id,
            venta__status='active'
        )
        serializer = PaymentScheduleSummarySerializer(schedules, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def history_by_lote(self, request):
        """
        Obtiene el historial completo de cronogramas de pagos de un lote específico.
        Incluye cronogramas de todas las ventas (activas, canceladas, completadas).
        """
        lote_id = request.query_params.get('lote_id')
        if not lote_id:
            return Response(
                {'error': 'lote_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar por todas las ventas del lote (incluyendo canceladas y completadas)
        schedules = self.get_queryset().filter(venta__lote_id=lote_id)
        serializer = PaymentScheduleSummarySerializer(schedules, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_venta(self, request):
        """
        Obtiene el cronograma de pagos de una venta específica.
        """
        venta_id = request.query_params.get('venta_id')
        if not venta_id:
            return Response(
                {'error': 'venta_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        schedules = self.get_queryset().filter(venta_id=venta_id)
        serializer = PaymentScheduleSummarySerializer(schedules, many=True)
        
        # Incluir información del pago inicial si existe
        initial_payments = Payment.objects.filter(
            venta_id=venta_id, 
            payment_type='initial'
        ).order_by('-created_at')
        
        initial_payment_data = []
        for payment in initial_payments:
            initial_payment_data.append({
                'id': payment.id,
                'amount': str(payment.amount),
                'payment_date': payment.payment_date.isoformat() if payment.payment_date else None,
                'payment_date_display': timezone.localtime(payment.payment_date).strftime('%d/%m/%Y %H:%M') if payment.payment_date else None,
                'method': payment.method,
                'receipt_number': payment.receipt_number,
                'receipt_date': payment.receipt_date.isoformat() if payment.receipt_date else None,
                'receipt_date_display': payment.receipt_date.strftime('%d/%m/%Y') if payment.receipt_date else None,
                'receipt_image': payment.receipt_image.url if payment.receipt_image else None,
                'notes': payment.notes,
                'created_at': payment.created_at.isoformat() if payment.created_at else None,
                'updated_at': payment.updated_at.isoformat() if payment.updated_at else None
            })
        
        return Response({
            'schedules': serializer.data,
            'initial_payments': initial_payment_data
        })

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """
        Obtiene todas las cuotas vencidas.
        """
        schedules = self.get_queryset().filter(status='overdue')
        serializer = PaymentScheduleSummarySerializer(schedules, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """
        Obtiene todas las cuotas pendientes.
        """
        schedules = self.get_queryset().filter(status='pending')
        serializer = PaymentScheduleSummarySerializer(schedules, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def register_payment(self, request, pk=None):
        """
        Registra un pago para una cuota específica del cronograma.
        """
        schedule = self.get_object()
        
        amount = request.data.get('amount')
        payment_method = request.data.get('method', 'transferencia')  # Frontend sends 'method', not 'payment_method'
        receipt_number = request.data.get('receipt_number')
        receipt_date = request.data.get('receipt_date')
        receipt_image = request.data.get('receipt_image')
        boleta_image = request.data.get('boleta_image')
        notes = request.data.get('notes')
        
        if not amount:
            return Response(
                {'error': 'amount is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = float(amount)
            
            # Get payment_date from request or use current time
            from django.utils import timezone
            payment_date = request.data.get('payment_date')
            if payment_date:
                # Parse the date string if provided
                try:
                    from datetime import datetime
                    payment_date = datetime.fromisoformat(payment_date.replace('Z', '+00:00'))
                except:
                    payment_date = timezone.now()
            else:
                payment_date = timezone.now()
            
            schedule.register_payment(
                amount=amount,
                payment_date=payment_date,
                payment_method=payment_method,
                receipt_number=receipt_number,
                receipt_date=receipt_date,
                receipt_image=receipt_image,
                boleta_image=boleta_image,
                notes=notes,
                recorded_by=request.user
            )
            
            serializer = self.get_serializer(schedule)
            return Response(serializer.data)
        except ValueError:
            return Response(
                {'error': 'Invalid amount format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def forgive_installment(self, request, pk=None):
        """
        Marca una cuota como absuelta/perdonada.
        """
        schedule = self.get_object()
        notes = request.data.get('notes')
        
        schedule.forgive_installment(
            notes=notes,
            recorded_by=request.user
        )
        
        serializer = self.get_serializer(schedule)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def modify_amount(self, request, pk=None):
        """
        Modifica el monto programado de una cuota.
        """
        schedule = self.get_object()
        
        new_amount = request.data.get('new_amount')
        notes = request.data.get('notes')
        
        if not new_amount:
            return Response(
                {'error': 'new_amount is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from decimal import Decimal
            import logging
            logger = logging.getLogger(__name__)
            
            new_amount = Decimal(str(new_amount))
            logger.info(f"Modificando cuota {schedule.id} de {schedule.scheduled_amount} a {new_amount}")
            
            schedule.modify_amount(
                new_amount=new_amount,
                notes=notes,
                recorded_by=request.user
            )
            
            logger.info(f"Cuota modificada exitosamente: {schedule.id}")
            serializer = self.get_serializer(schedule)
            return Response(serializer.data)
        except ValueError as e:
            logger.error(f"Error de formato en modify_amount: {str(e)}")
            return Response(
                {'error': 'Invalid amount format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error inesperado en modify_amount: {str(e)}")
            return Response(
                {'error': f'Error interno: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def modify_multiple_amounts(self, request):
        """
        Modifica el monto de múltiples cuotas seleccionadas y redistribuye automáticamente
        las cuotas restantes para mantener el total del cronograma.
        """
        schedule_ids = request.data.get('schedule_ids', [])
        new_amount = request.data.get('new_amount')
        notes = request.data.get('notes', '')
        
        if not schedule_ids:
            return Response(
                {'error': 'schedule_ids is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not new_amount:
            return Response(
                {'error': 'new_amount is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from decimal import Decimal
            new_amount = Decimal(str(new_amount))
            
            # Validar que todos los IDs existen y obtener las cuotas
            schedules = self.get_queryset().filter(id__in=schedule_ids)
            found_ids = list(schedules.values_list('id', flat=True))
            missing_ids = set(schedule_ids) - set(found_ids)
            
            if missing_ids:
                return Response(
                    {'error': f'Schedule IDs not found: {list(missing_ids)}'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validar que todas las cuotas pertenecen a la misma venta
            unique_venta_ids = set(schedules.values_list('venta_id', flat=True))
            
            if len(unique_venta_ids) > 1:
                return Response(
                    {'error': 'All schedules must belong to the same sale'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar que las cuotas se pueden modificar (no pagadas ni perdonadas)
            non_modifiable_schedules = schedules.filter(status__in=['paid', 'forgiven'])
            if non_modifiable_schedules.exists():
                return Response(
                    {'error': 'Cannot modify paid or forgiven installments'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Modificar todas las cuotas seleccionadas con el mismo monto
            venta = schedules.first().venta
            modified_schedules = []
            
            for schedule in schedules:
                old_amount = schedule.scheduled_amount
                schedule.scheduled_amount = new_amount
                schedule.recorded_by = request.user
                
                modification_note = f"Modificación múltiple de {old_amount} a {new_amount}"
                if notes:
                    modification_note += f" - {notes}"
                    
                if schedule.notes:
                    schedule.notes += f"\n{modification_note}"
                else:
                    schedule.notes = modification_note
                    
                schedule.save()
                modified_schedules.append(schedule)
            
            # Redistribuir las cuotas no seleccionadas para mantener el total
            self._redistribute_remaining_installments_bulk(venta, schedule_ids, request.user)
            
            # Recargar todas las cuotas de la venta para devolver el estado actualizado
            all_schedules = self.get_queryset().filter(venta=venta).order_by('installment_number')
            serializer = PaymentScheduleSummarySerializer(all_schedules, many=True)
            
            return Response({
                'message': f'Successfully modified {len(modified_schedules)} installments',
                'modified_count': len(modified_schedules),
                'schedules': serializer.data
            })
            
        except ValueError:
            return Response(
                {'error': 'Invalid amount format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Internal error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _redistribute_remaining_installments_bulk(self, venta, excluded_schedule_ids, user):
        """
        Redistribuye automáticamente las cuotas que NO están en la lista de exclusión
        para mantener el total del cronograma igual al saldo objetivo de la venta.
        """
        try:
            from decimal import Decimal
            import logging
            logger = logging.getLogger(__name__)
            
            # Calcular el saldo objetivo total (precio de venta - pago inicial)
            target_total = venta.sale_price - venta.initial_payment
            
            # Obtener todas las cuotas de esta venta
            all_schedules = PaymentSchedule.objects.filter(venta=venta).order_by('installment_number')
            
            # Separar cuotas que NO se pueden modificar (pagadas, parciales, perdonadas)
            # de las que SÍ se pueden redistribuir (pendientes y vencidas)
            # EXCLUIR las cuotas que acabamos de modificar
            fixed_schedules = all_schedules.filter(
                models.Q(status__in=['paid', 'partial', 'forgiven']) |
                models.Q(id__in=excluded_schedule_ids)
            )
            redistributable_schedules = all_schedules.filter(
                status__in=['pending', 'overdue']
            ).exclude(id__in=excluded_schedule_ids)
            
            # Calcular el monto total ya "fijo" (cuotas que no se pueden cambiar + cuotas modificadas)
            from django.db.models import Sum
            fixed_total = fixed_schedules.aggregate(
                total=Sum('scheduled_amount')
            )['total'] or Decimal('0.00')
            
            # El saldo restante a distribuir entre las cuotas redistributables
            remaining_to_distribute = target_total - fixed_total
            
            # Contar cuántas cuotas se pueden redistribuir
            redistributable_count = redistributable_schedules.count()
            
            if redistributable_count > 0 and remaining_to_distribute > 0:
                # Calcular el monto base para cada cuota redistributable (redondeado hacia abajo)
                base_amount = (remaining_to_distribute / redistributable_count).quantize(
                    Decimal('1'), rounding='ROUND_DOWN'
                )
                
                # Calcular cuánto sobra para ajustar en la última cuota redistributable
                total_base = base_amount * (redistributable_count - 1)
                last_amount = remaining_to_distribute - total_base
                
                # Aplicar la redistribución
                redistributable_list = list(redistributable_schedules)
                for i, schedule in enumerate(redistributable_list):
                    if i == len(redistributable_list) - 1:  # Última cuota
                        new_amount = last_amount
                    else:
                        new_amount = base_amount
                    
                    # Solo actualizar si el monto cambió y es mayor o igual a 0.01
                    if schedule.scheduled_amount != new_amount and new_amount >= Decimal('0.01'):
                        old_amount = schedule.scheduled_amount
                        schedule.scheduled_amount = new_amount
                        schedule.recorded_by = user
                        
                        # Agregar nota de redistribución automática
                        redistribution_note = f"Redistribución automática tras modificación múltiple: de {old_amount} a {new_amount}"
                        if schedule.notes:
                            schedule.notes += f"\n{redistribution_note}"
                        else:
                            schedule.notes = redistribution_note
                        
                        schedule.save()
            
            elif redistributable_count == 0:
                # No hay cuotas redistributables - todas están fijas
                pass
                
        except Exception as e:
            # Log del error para debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error en redistribución múltiple de cuotas para venta {venta.id}: {str(e)}")
            # No relanzar la excepción para evitar que falle la modificación principal
            pass

    @action(detail=False, methods=['post'])
    def generate_for_lote(self, request):
        """
        Genera el cronograma de pagos para un lote específico.
        """
        lote_id = request.data.get('lote_id')
        if not lote_id:
            return Response(
                {'error': 'lote_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from lotes.models import Lote
            from sales.models import Venta
            
            lote = Lote.objects.get(id=lote_id)
            
            # Buscar venta activa para el lote
            active_venta = Venta.get_active_sale_for_lote(lote)
            if not active_venta:
                return Response(
                    {'error': 'No active sale found for this lote'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            schedules = PaymentSchedule.generate_schedule_for_venta(active_venta)
            serializer = PaymentScheduleSummarySerializer(schedules, many=True)
            
            return Response({
                'message': f'Payment schedule generated for venta {active_venta.id}',
                'schedules': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Lote.DoesNotExist:
            return Response(
                {'error': 'Lote not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )