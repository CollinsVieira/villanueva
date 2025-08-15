from django.utils import timezone
from django.db.models import Sum
from datetime import timedelta
from decimal import Decimal


class ReportGenerators:
    """
    Clase que contiene todos los métodos para generar diferentes tipos de reportes.
    """
    
    @staticmethod
    def generate_customers_debt_report(report_instance):
        """
        Genera reporte de clientes con deuda.
        """
        from .models import Report
        
        customers_debt = Report.objects.customers_with_debt()
        current_date = timezone.now().date()
        
        report_data = {
            'total_customers_with_debt': len(customers_debt),
            'total_debt_amount': sum(item['total_debt'] for item in customers_debt),
            'customers': []
        }
        
        for item in customers_debt:
            customer = item['customer']
            customer_data = {
                'customer_id': customer.id,
                'customer_name': customer.full_name,
                'customer_email': customer.email,
                'customer_phone': customer.phone,
                'total_debt': float(item['total_debt']),
                'pending_installments': item['pending_installments'],
                'lotes': []
            }
            
            for lote in customer.lotes.all():
                if lote.remaining_balance > 0:
                    # Calcular días hasta próximo vencimiento
                    last_payment = lote.payments.order_by('-payment_date').first()
                    if last_payment and lote.financing_months > 0:
                        # Asumir pagos mensuales
                        next_payment_due = last_payment.payment_date + timedelta(days=30)
                        days_until_due = (next_payment_due - current_date).days
                    else:
                        days_until_due = None
                    
                    customer_data['lotes'].append({
                        'lote_id': lote.id,
                        'lote_description': str(lote),
                        'remaining_balance': float(lote.remaining_balance),
                        'total_payments_made': lote.payments.count(),
                        'financing_months': lote.financing_months,
                        'days_until_next_payment': days_until_due
                    })
            
            report_data['customers'].append(customer_data)
        
        return report_data
    
    @staticmethod
    def generate_payments_history_report(report_instance):
        """
        Genera reporte del historial de pagos.
        """
        from payments.models import Payment
        
        queryset = Payment.objects.all()
        
        if report_instance.start_date:
            queryset = queryset.filter(payment_date__gte=report_instance.start_date)
        if report_instance.end_date:
            queryset = queryset.filter(payment_date__lte=report_instance.end_date)
        
        payments = queryset.select_related('lote', 'lote__owner')
        
        return {
            'total_payments': payments.count(),
            'total_amount': float(payments.aggregate(Sum('amount'))['amount__sum'] or 0),
            'period': {
                'start_date': report_instance.start_date.isoformat() if report_instance.start_date else None,
                'end_date': report_instance.end_date.isoformat() if report_instance.end_date else None
            },
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
                } for payment in payments[:1000]  # Limitar a 1000 registros para performance
            ]
        }
    
    @staticmethod
    def generate_available_lots_report(report_instance):
        """
        Genera reporte de lotes disponibles.
        """
        from lotes.models import Lote
        from .models import Report
        
        available_lots = Lote.objects.filter(status='disponible')
        summary = Report.objects.available_lots_summary()
        
        return {
            'summary': {
                'total_count': summary['total_count'],
                'total_area': float(summary['total_area'] or 0),
                'total_value': float(summary['total_value'] or 0),
                'avg_price_per_m2': float(summary['avg_price_per_m2'] or 0)
            },
            'lots': [
                {
                    'id': lote.id,
                    'block': lote.block,
                    'lot_number': lote.lot_number,
                    'area': float(lote.area),
                    'price': float(lote.price),
                    'price_per_m2': float(lote.price / lote.area) if lote.area > 0 else 0,
                    'initial_payment': float(lote.initial_payment),
                    'financing_months': lote.financing_months
                } for lote in available_lots
            ]
        }
    
    @staticmethod
    def generate_sales_summary_report(report_instance):
        """
        Genera reporte resumen de ventas.
        """
        from .models import Report
        
        return Report.objects.sales_summary(report_instance.start_date, report_instance.end_date)
    
    @staticmethod
    def generate_financial_overview_report(report_instance):
        """
        Genera reporte de resumen financiero general.
        """
        from .models import Report
        
        sales_data = Report.objects.sales_summary(report_instance.start_date, report_instance.end_date)
        payments_data = Report.objects.payments_summary(report_instance.start_date, report_instance.end_date)
        available_data = Report.objects.available_lots_summary()
        customers_debt = Report.objects.customers_with_debt()
        
        return {
            'sales': sales_data,
            'payments': {
                'total_payments': payments_data['total_payments'],
                'total_amount': float(payments_data['total_amount'])
            },
            'inventory': {
                'available_lots': available_data['total_count'],
                'available_value': float(available_data['total_value'] or 0)
            },
            'receivables': {
                'customers_with_debt': len(customers_debt),
                'total_debt': float(sum(item['total_debt'] for item in customers_debt))
            }
        }
    
    @staticmethod
    def generate_pending_installments_report(report_instance):
        """
        Genera reporte de cuotas pendientes por cliente.
        """
        from .models import Report
        
        customers_debt = Report.objects.customers_with_debt()
        
        report_data = {
            'total_pending_installments': sum(item['pending_installments'] for item in customers_debt),
            'customers': []
        }
        
        for item in customers_debt:
            if item['pending_installments'] > 0:
                customer = item['customer']
                customer_data = {
                    'customer_name': customer.full_name,
                    'pending_installments': item['pending_installments'],
                    'total_debt': float(item['total_debt']),
                    'lotes_detail': []
                }
                
                for lote in customer.lotes.all():
                    total_payments = lote.payments.count()
                    pending = max(0, lote.financing_months - total_payments)
                    
                    if pending > 0:
                        # Calcular cuota mensual estimada
                        monthly_payment = lote.remaining_balance / pending if pending > 0 else 0
                        
                        customer_data['lotes_detail'].append({
                            'lote': str(lote),
                            'pending_installments': pending,
                            'remaining_balance': float(lote.remaining_balance),
                            'estimated_monthly_payment': float(monthly_payment)
                        })
                
                report_data['customers'].append(customer_data)
        
        return report_data
    
    @staticmethod
    def generate_monthly_collections_report(report_instance):
        """
        Genera reporte de cobranzas mensuales.
        """
        from .models import Report
        
        payments_data = Report.objects.payments_summary(report_instance.start_date, report_instance.end_date)
        
        return {
            'period': {
                'start_date': report_instance.start_date.isoformat() if report_instance.start_date else None,
                'end_date': report_instance.end_date.isoformat() if report_instance.end_date else None
            },
            'total_collected': float(payments_data['total_amount']),
            'total_transactions': payments_data['total_payments'],
            'by_method': [
                {
                    'method': item['method'],
                    'count': item['count'],
                    'total': float(item['total'])
                } for item in payments_data['by_method']
            ],
            'monthly_breakdown': [
                {
                    'month': item['month'],
                    'count': item['count'],
                    'total': float(item['total'])
                } for item in payments_data['monthly_breakdown']
            ]
        }
