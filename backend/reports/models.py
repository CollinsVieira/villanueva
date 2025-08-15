from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.db.models import Sum, Count, Q, F
from decimal import Decimal
from datetime import datetime, timedelta
from customers.models import Customer
from lotes.models import Lote
from payments.models import Payment


class ReportManager(models.Manager):
    """
    Manager personalizado para manejar consultas complejas de reportes.
    """
    
    def customers_with_debt(self):
        """
        Retorna clientes que tienen deuda pendiente.
        """
        customers_with_lots = Customer.objects.filter(lotes__isnull=False).distinct()
        customers_debt = []
        
        for customer in customers_with_lots:
            total_debt = Decimal('0.00')
            pending_installments = 0
            
            for lote in customer.lotes.all():
                if lote.remaining_balance > 0:
                    total_debt += lote.remaining_balance
                    
                    # Calcular cuotas pendientes
                    total_payments = lote.payments.count()
                    pending_installments += max(0, lote.financing_months - total_payments)
            
            if total_debt > 0:
                customers_debt.append({
                    'customer': customer,
                    'total_debt': total_debt,
                    'pending_installments': pending_installments
                })
        
        return customers_debt
    
    def available_lots_summary(self):
        """
        Retorna resumen de lotes disponibles.
        """
        return Lote.objects.filter(status='disponible').aggregate(
            total_count=Count('id'),
            total_area=Sum('area'),
            total_value=Sum('price'),
            avg_price_per_m2=Sum('price') / Sum('area') if Sum('area') else 0
        )
    
    def sales_summary(self, start_date=None, end_date=None):
        """
        Retorna resumen de ventas en un período específico.
        """
        queryset = Lote.objects.filter(status='vendido')
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
            
        return {
            'total_lots_sold': queryset.count(),
            'total_area_sold': queryset.aggregate(Sum('area'))['area__sum'] or 0,
            'total_sales_value': queryset.aggregate(Sum('price'))['price__sum'] or 0,
            'total_initial_payments': queryset.aggregate(Sum('initial_payment'))['initial_payment__sum'] or 0,
        }
    
    def payments_summary(self, start_date=None, end_date=None):
        """
        Retorna resumen de pagos en un período específico.
        """
        queryset = Payment.objects.all()
        
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
            
        return {
            'total_payments': queryset.count(),
            'total_amount': queryset.aggregate(Sum('amount'))['amount__sum'] or 0,
            'by_method': queryset.values('method').annotate(
                count=Count('id'),
                total=Sum('amount')
            ),
            'monthly_breakdown': queryset.extra(
                select={'month': "DATE_FORMAT(payment_date, '%%Y-%%m')"}
            ).values('month').annotate(
                count=Count('id'),
                total=Sum('amount')
            ).order_by('month')
        }


class Report(models.Model):
    """
    Modelo para almacenar reportes generados del sistema.
    """
    
    REPORT_TYPE_CHOICES = [
        ('customers_debt', _('Clientes con Deuda')),
        ('payments_history', _('Historial de Pagos')),
        ('available_lots', _('Lotes Disponibles')),
        ('sales_summary', _('Resumen de Ventas')),
        ('financial_overview', _('Resumen Financiero')),
        ('pending_installments', _('Cuotas Pendientes')),
        ('monthly_collections', _('Cobranzas Mensuales')),
        ('custom', _('Personalizado')),
    ]
    
    STATUS_CHOICES = [
        ('pending', _('Pendiente')),
        ('processing', _('Procesando')),
        ('completed', _('Completado')),
        ('failed', _('Fallido')),
    ]
    
    name = models.CharField(_("Nombre del Reporte"), max_length=200)
    report_type = models.CharField(
        _("Tipo de Reporte"),
        max_length=50,
        choices=REPORT_TYPE_CHOICES
    )
    description = models.TextField(_("Descripción"), blank=True)
    
    # Parámetros del reporte (fecha inicio, fecha fin, etc.)
    start_date = models.DateField(_("Fecha de Inicio"), blank=True, null=True)
    end_date = models.DateField(_("Fecha de Fin"), blank=True, null=True)
    
    # Estado del reporte
    status = models.CharField(
        _("Estado"),
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Datos del reporte (JSON field para flexibilidad)
    data = models.JSONField(_("Datos del Reporte"), default=dict, blank=True)
    
    # Metadatos
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    generated_at = models.DateTimeField(_("Generado el"), blank=True, null=True)
    
    # Usuario que solicitó el reporte
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports',
        verbose_name=_("Solicitado por")
    )
    
    # Manager personalizado
    objects = ReportManager()
    
    class Meta:
        verbose_name = _("Reporte")
        verbose_name_plural = _("Reportes")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['report_type', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.get_report_type_display()}"
    
    def generate_report_data(self):
        """
        Genera los datos del reporte basado en el tipo.
        """
        from .report_generators import ReportGenerators
        
        self.status = 'processing'
        self.save()
        
        try:
            if self.report_type == 'customers_debt':
                self.data = ReportGenerators.generate_customers_debt_report(self)
            elif self.report_type == 'payments_history':
                self.data = ReportGenerators.generate_payments_history_report(self)
            elif self.report_type == 'available_lots':
                self.data = ReportGenerators.generate_available_lots_report(self)
            elif self.report_type == 'sales_summary':
                self.data = ReportGenerators.generate_sales_summary_report(self)
            elif self.report_type == 'financial_overview':
                self.data = ReportGenerators.generate_financial_overview_report(self)
            elif self.report_type == 'pending_installments':
                self.data = ReportGenerators.generate_pending_installments_report(self)
            elif self.report_type == 'monthly_collections':
                self.data = ReportGenerators.generate_monthly_collections_report(self)
            
            self.status = 'completed'
            self.generated_at = timezone.now()
            
        except Exception as e:
            self.status = 'failed'
            self.data = {'error': str(e)}
        
        self.save()
        return self.data
