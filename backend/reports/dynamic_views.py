from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from customers.models import Customer
from lotes.models import Lote
from payments.models import Payment


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customers_debt_live(request):
    """
    Genera reporte de clientes con deuda en tiempo real.
    """
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Obtener clientes con lotes
        customers_with_lots = Customer.objects.filter(lotes__isnull=False).distinct()
        customers_debt = []
        current_date = timezone.now().date()
        
        for customer in customers_with_lots:
            total_debt = Decimal('0.00')
            pending_installments = 0
            overdue_installments_total = 0
            customer_lotes = []
            
            for lote in customer.lotes.all():
                if lote.remaining_balance > 0:
                    total_debt += lote.remaining_balance
                    
                    # Obtener pagos realizados (solo cuotas mensuales, no pago inicial)
                    payments_query = lote.payments.filter(payment_type='installment')
                    if start_date:
                        payments_query = payments_query.filter(payment_date__gte=start_date)
                    if end_date:
                        payments_query = payments_query.filter(payment_date__lte=end_date)
                    
                    total_payments = payments_query.count()
                    pending = max(0, lote.financing_months - total_payments)
                    pending_installments += pending
                    
                    # Calcular cuotas vencidas y días hasta próximo vencimiento usando la nueva lógica
                    overdue_installments = 0
                    days_until_due = None
                    
                    if lote.financing_months > 0 and lote.payment_day:
                        # Obtener la próxima cuota pendiente (la que debería vencer)
                        next_installment_number = total_payments + 1
                        
                        if next_installment_number <= lote.financing_months:
                            # Usar el método estático para calcular la fecha de vencimiento
                            next_due_date = Payment.calculate_next_due_date(lote, next_installment_number)
                            
                            if next_due_date:
                                # Calcular días hasta vencimiento o días vencidos
                                days_until_due = (next_due_date - current_date).days
                                
                                # Si la fecha ya pasó, está vencido
                                if next_due_date < current_date:
                                    overdue_installments = 1
                                    overdue_installments_total += 1
                                else:
                                    overdue_installments = 0
                            else:
                                # Fallback si no se puede calcular la fecha
                                days_until_due = None
                                overdue_installments = 0
                        else:
                            # Todas las cuotas están pagadas
                            days_until_due = None
                            overdue_installments = 0
                    
                    customer_lotes.append({
                        'lote_id': lote.id,
                        'lote_description': str(lote),
                        'remaining_balance': float(lote.remaining_balance),
                        'total_payments_made': lote.payments.filter(payment_type='installment').count(),
                        'financing_months': lote.financing_months,
                        'pending_installments': pending,
                        'overdue_installments': overdue_installments,
                        'payment_day': lote.payment_day,
                        'days_until_next_payment': days_until_due
                    })
            
            if total_debt > 0:
                customers_debt.append({
                    'customer_id': customer.id,
                    'customer_name': customer.full_name,
                    'customer_email': customer.email,
                    'customer_phone': customer.phone,
                    'total_debt': float(total_debt),
                    'pending_installments': pending_installments,
                    'overdue_installments': overdue_installments_total,
                    'lotes': customer_lotes
                })
        
        report_data = {
            'total_customers_with_debt': len(customers_debt),
            'total_debt_amount': sum(item['total_debt'] for item in customers_debt),
            'total_overdue_installments': sum(item['overdue_installments'] for item in customers_debt),
            'customers': customers_debt,
            'generated_at': timezone.now().isoformat(),
            'period': {
                'start_date': start_date,
                'end_date': end_date
            }
        }
        
        return Response(report_data)
        
    except Exception as e:
        return Response(
            {'error': f'Error generando reporte de deudas: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payments_history_live(request):
    """
    Genera reporte de historial de pagos en tiempo real.
    """
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        method_filter = request.query_params.get('method')
        
        queryset = Payment.objects.select_related('lote', 'lote__owner').all()
        
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
        if method_filter:
            queryset = queryset.filter(method=method_filter)
        
        payments = queryset.order_by('-payment_date')
        
        # Agrupar por método
        by_method = queryset.values('method').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('method')
        
        # Agrupar por mes
        monthly_data = {}
        for payment in payments:
            month_key = payment.payment_date.strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = {'count': 0, 'total': 0}
            monthly_data[month_key]['count'] += 1
            monthly_data[month_key]['total'] += float(payment.amount)
        
        monthly_breakdown = [
            {'month': month, 'count': data['count'], 'total': data['total']}
            for month, data in sorted(monthly_data.items())
        ]
        
        return Response({
            'total_payments': payments.count(),
            'total_amount': float(payments.aggregate(Sum('amount'))['amount__sum'] or 0),
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'by_method': [
                {
                    'method': item['method'],
                    'count': item['count'],
                    'total': float(item['total'])
                } for item in by_method
            ],
            'monthly_breakdown': monthly_breakdown,
            'payments': [
                {
                    'id': payment.id,
                    'amount': float(payment.amount),
                    'payment_date': payment.payment_date.isoformat(),
                    'method': payment.method,
                    'receipt_number': payment.receipt_number,
                    'lote': str(payment.lote),
                    'customer': payment.lote.owner.full_name if payment.lote.owner else 'Sin propietario',
                    'installment_number': payment.installment_number,
                    'notes': payment.notes
                } for payment in payments[:500]  # Limitar para performance
            ],
            'generated_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error generando historial de pagos: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_lots_live(request):
    """
    Genera reporte de lotes disponibles en tiempo real.
    """
    try:
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        min_area = request.query_params.get('min_area')
        max_area = request.query_params.get('max_area')
        block_filter = request.query_params.get('block')
        
        queryset = Lote.objects.filter(status='disponible')
        
        if min_price:
            queryset = queryset.filter(price__gte=float(min_price))
        if max_price:
            queryset = queryset.filter(price__lte=float(max_price))
        if min_area:
            queryset = queryset.filter(area__gte=float(min_area))
        if max_area:
            queryset = queryset.filter(area__lte=float(max_area))
        if block_filter:
            queryset = queryset.filter(block=block_filter)
        
        # Calcular resumen
        summary = queryset.aggregate(
            total_count=Count('id'),
            total_area=Sum('area'),
            total_value=Sum('price'),
        )
        
        avg_price_per_m2 = 0
        if summary['total_area'] and summary['total_area'] > 0:
            avg_price_per_m2 = summary['total_value'] / summary['total_area']
        
        lots_data = []
        for lote in queryset.order_by('block', 'lot_number'):
            price_per_m2 = float(lote.price / lote.area) if lote.area > 0 else 0
            lots_data.append({
                'id': lote.id,
                'block': lote.block,
                'lot_number': lote.lot_number,
                'area': float(lote.area),
                'price': float(lote.price),
                'price_per_m2': price_per_m2,
                'initial_payment': float(lote.initial_payment),
                'financing_months': lote.financing_months
            })
        
        return Response({
            'summary': {
                'total_count': summary['total_count'] or 0,
                'total_area': float(summary['total_area'] or 0),
                'total_value': float(summary['total_value'] or 0),
                'avg_price_per_m2': float(avg_price_per_m2)
            },
            'lots': lots_data,
            'generated_at': timezone.now().isoformat(),
            'filters_applied': {
                'min_price': min_price,
                'max_price': max_price,
                'min_area': min_area,
                'max_area': max_area,
                'block': block_filter
            }
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error generando reporte de lotes: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_installments_live(request):
    """
    Genera reporte de cuotas pendientes en tiempo real - formato legible.
    """
    try:
        # Obtener clientes con lotes
        customers_with_lots = Customer.objects.filter(lotes__isnull=False).distinct()
        pending_customers = []
        total_pending_installments = 0
        total_pending_amount = Decimal('0.00')
        
        for customer in customers_with_lots:
            customer_pending_installments = 0
            customer_pending_amount = Decimal('0.00')
            customer_lotes = []
            
            for lote in customer.lotes.all():
                total_payments = lote.payments.filter(payment_type='installment').count()
                pending = max(0, lote.financing_months - total_payments)
                
                # Si el saldo pendiente es 0, el lote está completamente pagado
                # aunque tenga cuotas pendientes, no debe aparecer en el reporte
                if lote.remaining_balance <= 0:
                    continue
                
                if pending > 0:
                    # Calcular cuota mensual real
                    monthly_payment = float(lote.monthly_installment) if hasattr(lote, 'monthly_installment') else (lote.remaining_balance / pending if pending > 0 else 0)
                    lote_pending_amount = lote.remaining_balance
                    
                    customer_pending_installments += pending
                    customer_pending_amount += lote_pending_amount
                    
                    # Calcular información de vencimiento usando la nueva lógica del modelo Payment
                    current_date = timezone.now().date()
                    next_due_date = None
                    days_overdue = 0
                    overdue_installments = 0
                    
                    if lote.financing_months > 0 and lote.payment_day:
                        # Obtener la próxima cuota pendiente (la que debería vencer)
                        next_installment_number = total_payments + 1
                        
                        if next_installment_number <= lote.financing_months:
                            # Usar el método estático para calcular la fecha de vencimiento
                            next_due_date = Payment.calculate_next_due_date(lote, next_installment_number)
                            
                            if next_due_date:
                                # Calcular días de atraso si la fecha ya pasó
                                if next_due_date < current_date:
                                    days_overdue = (current_date - next_due_date).days
                                    
                                    # Calcular cuotas vencidas: cuántas cuotas deberían haberse pagado desde la última hasta hoy
                                    # Si la próxima cuota vence en junio 2023 y hoy es 2025, calcular cuántos meses han pasado
                                    months_overdue = 0
                                    if days_overdue > 0:
                                        # Calcular meses completos de atraso
                                        months_overdue = days_overdue // 30  # Aproximación de meses
                                        
                                        # Si hay más de 30 días de atraso, al menos 1 cuota está vencida
                                        if months_overdue >= 1:
                                            # El número de cuotas vencidas es el mínimo entre los meses de atraso y las cuotas pendientes
                                            overdue_installments = min(months_overdue, pending)
                                        else:
                                            overdue_installments = 1 if days_overdue > 0 else 0
                                    else:
                                        overdue_installments = 0
                                else:
                                    days_overdue = 0
                                    overdue_installments = 0
                            else:
                                # Fallback si no se puede calcular la fecha
                                days_overdue = 0
                                overdue_installments = 0
                        else:
                            # Todas las cuotas están pagadas
                            days_overdue = 0
                            overdue_installments = 0
                    
                    # Determinar estado basado en cuotas vencidas y próximo vencimiento
                    if overdue_installments > 0:
                        status = 'overdue'
                    elif next_due_date and (next_due_date - current_date).days <= 7:
                        status = 'due_soon'
                    else:
                        status = 'current'
                    
                    customer_lotes.append({
                        'lote_description': str(lote),
                        'pending_installments': pending,
                        'overdue_installments': overdue_installments,
                        'remaining_balance': float(lote_pending_amount),
                        'monthly_payment': float(monthly_payment),
                        'total_financing_months': lote.financing_months,
                        'payments_made': total_payments,
                        'completion_percentage': round((total_payments / lote.financing_months) * 100, 2) if lote.financing_months > 0 else 0,
                        'payment_day': lote.payment_day,
                        'next_due_date': next_due_date.isoformat() if next_due_date else None,
                        'days_until_due': (next_due_date - current_date).days if next_due_date else None,
                        'days_overdue': days_overdue,
                        'status': status
                    })
            
            if customer_pending_installments > 0:
                total_pending_installments += customer_pending_installments
                total_pending_amount += customer_pending_amount
                
                pending_customers.append({
                    'customer_name': customer.full_name,
                    'customer_email': customer.email,
                    'customer_phone': customer.phone,
                    'total_pending_installments': customer_pending_installments,
                    'total_pending_amount': float(customer_pending_amount),
                    'average_monthly_payment': float(customer_pending_amount / customer_pending_installments) if customer_pending_installments > 0 else 0,
                    'lotes': customer_lotes
                })
        
        # Clasificar por urgencia
        overdue_customers = [c for c in pending_customers if any(l['status'] == 'overdue' for l in c['lotes'])]
        due_soon_customers = [c for c in pending_customers if any(l['status'] == 'due_soon' for l in c['lotes']) and c not in overdue_customers]
        current_customers = [c for c in pending_customers if c not in overdue_customers and c not in due_soon_customers]
        
        # Calcular total de cuotas vencidas
        total_overdue_installments = sum(
            sum(lote['overdue_installments'] for lote in customer['lotes'])
            for customer in pending_customers
        )
        
        return Response({
            'summary': {
                'total_customers_with_pending': len(pending_customers),
                'total_pending_installments': total_pending_installments,
                'total_overdue_installments': total_overdue_installments,
                'total_pending_amount': float(total_pending_amount),
                'overdue_customers': len(overdue_customers),
                'due_soon_customers': len(due_soon_customers),
                'current_customers': len(current_customers)
            },
            'customers_by_priority': {
                'overdue': overdue_customers,
                'due_soon': due_soon_customers,
                'current': current_customers
            },
            'all_customers': pending_customers,
            'generated_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error generando reporte de cuotas pendientes: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sales_summary_live(request):
    """
    Genera resumen de ventas en tiempo real.
    """
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = Lote.objects.filter(status='vendido')
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        # Ventas por mes
        sales_by_month = {}
        for lote in queryset:
            month_key = lote.created_at.strftime('%Y-%m')
            if month_key not in sales_by_month:
                sales_by_month[month_key] = {
                    'count': 0,
                    'total_value': 0,
                    'total_area': 0,
                    'total_initial_payments': 0
                }
            sales_by_month[month_key]['count'] += 1
            sales_by_month[month_key]['total_value'] += float(lote.price)
            sales_by_month[month_key]['total_area'] += float(lote.area)
            sales_by_month[month_key]['total_initial_payments'] += float(lote.initial_payment)
        
        monthly_breakdown = [
            {
                'month': month,
                'count': data['count'],
                'total_value': data['total_value'],
                'total_area': data['total_area'],
                'total_initial_payments': data['total_initial_payments'],
                'avg_price_per_lot': data['total_value'] / data['count'] if data['count'] > 0 else 0
            }
            for month, data in sorted(sales_by_month.items())
        ]
        
        return Response({
            'total_lots_sold': queryset.count(),
            'total_area_sold': float(queryset.aggregate(Sum('area'))['area__sum'] or 0),
            'total_sales_value': float(queryset.aggregate(Sum('price'))['price__sum'] or 0),
            'total_initial_payments': float(queryset.aggregate(Sum('initial_payment'))['initial_payment__sum'] or 0),
            'average_lot_price': float(queryset.aggregate(Sum('price'))['price__sum'] or 0) / queryset.count() if queryset.count() > 0 else 0,
            'monthly_breakdown': monthly_breakdown,
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'generated_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error generando resumen de ventas: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_overview_live(request):
    """
    Genera resumen financiero general en tiempo real.
    """
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Obtener datos de ventas
        sales_queryset = Lote.objects.filter(status='vendido')
        if start_date:
            sales_queryset = sales_queryset.filter(created_at__gte=start_date)
        if end_date:
            sales_queryset = sales_queryset.filter(created_at__lte=end_date)
        
        # Obtener datos de pagos
        payments_queryset = Payment.objects.all()
        if start_date:
            payments_queryset = payments_queryset.filter(payment_date__gte=start_date)
        if end_date:
            payments_queryset = payments_queryset.filter(payment_date__lte=end_date)
        
        # Obtener datos de inventario
        available_lots = Lote.objects.filter(status='disponible')
        
        # Calcular deudas pendientes
        total_debt = Decimal('0.00')
        customers_with_debt = 0
        for customer in Customer.objects.filter(lotes__isnull=False).distinct():
            customer_debt = sum(lote.remaining_balance for lote in customer.lotes.all() if lote.remaining_balance > 0)
            if customer_debt > 0:
                total_debt += customer_debt
                customers_with_debt += 1
        
        return Response({
            'sales': {
                'total_lots_sold': sales_queryset.count(),
                'total_sales_value': float(sales_queryset.aggregate(Sum('price'))['price__sum'] or 0),
                'total_initial_payments': float(sales_queryset.aggregate(Sum('initial_payment'))['initial_payment__sum'] or 0)
            },
            'payments': {
                'total_payments': payments_queryset.count(),
                'total_amount': float(payments_queryset.aggregate(Sum('amount'))['amount__sum'] or 0)
            },
            'inventory': {
                'available_lots': available_lots.count(),
                'available_value': float(available_lots.aggregate(Sum('price'))['price__sum'] or 0),
                'total_available_area': float(available_lots.aggregate(Sum('area'))['area__sum'] or 0)
            },
            'receivables': {
                'customers_with_debt': customers_with_debt,
                'total_debt': float(total_debt)
            },
            'kpis': {
                'conversion_rate': round((sales_queryset.count() / (sales_queryset.count() + available_lots.count())) * 100, 2) if (sales_queryset.count() + available_lots.count()) > 0 else 0,
                'average_payment': float(payments_queryset.aggregate(Sum('amount'))['amount__sum'] or 0) / payments_queryset.count() if payments_queryset.count() > 0 else 0,
                'collection_efficiency': round((float(payments_queryset.aggregate(Sum('amount'))['amount__sum'] or 0) / float(total_debt)) * 100, 2) if total_debt > 0 else 100
            },
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'generated_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error generando resumen financiero: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_collections_live(request):
    """
    Genera reporte de cobranzas mensuales en tiempo real.
    """
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = Payment.objects.all()
        
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
        
        # Agrupar por mes y método
        collections_by_month = {}
        methods_summary = {}
        
        for payment in queryset:
            month_key = payment.payment_date.strftime('%Y-%m')
            
            # Por mes
            if month_key not in collections_by_month:
                collections_by_month[month_key] = {
                    'count': 0,
                    'total': 0,
                    'by_method': {}
                }
            
            collections_by_month[month_key]['count'] += 1
            collections_by_month[month_key]['total'] += float(payment.amount)
            
            # Por método dentro del mes
            if payment.method not in collections_by_month[month_key]['by_method']:
                collections_by_month[month_key]['by_method'][payment.method] = {
                    'count': 0,
                    'total': 0
                }
            
            collections_by_month[month_key]['by_method'][payment.method]['count'] += 1
            collections_by_month[month_key]['by_method'][payment.method]['total'] += float(payment.amount)
            
            # Resumen general por método
            if payment.method not in methods_summary:
                methods_summary[payment.method] = {
                    'count': 0,
                    'total': 0
                }
            
            methods_summary[payment.method]['count'] += 1
            methods_summary[payment.method]['total'] += float(payment.amount)
        
        monthly_breakdown = [
            {
                'month': month,
                'month_name': timezone.datetime.strptime(month, '%Y-%m').strftime('%B %Y'),
                'count': data['count'],
                'total': data['total'],
                'average_per_payment': data['total'] / data['count'] if data['count'] > 0 else 0,
                'by_method': [
                    {
                        'method': method,
                        'count': method_data['count'],
                        'total': method_data['total']
                    }
                    for method, method_data in data['by_method'].items()
                ]
            }
            for month, data in sorted(collections_by_month.items())
        ]
        
        return Response({
            'total_collected': float(queryset.aggregate(Sum('amount'))['amount__sum'] or 0),
            'total_transactions': queryset.count(),
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'by_method': [
                {
                    'method': method,
                    'count': data['count'],
                    'total': data['total'],
                    'percentage': round((data['total'] / float(queryset.aggregate(Sum('amount'))['amount__sum'] or 1)) * 100, 2)
                }
                for method, data in methods_summary.items()
            ],
            'monthly_breakdown': monthly_breakdown,
            'generated_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error generando reporte de cobranzas: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
