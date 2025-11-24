from django.db import models
from django.conf import settings
from django.utils.functional import cached_property
from django.utils.translation import gettext_lazy as _
from decimal import Decimal

class Customer(models.Model):
    """
    Modelo para representar a un cliente con nueva arquitectura basada en ventas.
    """
    first_name = models.CharField(_("Nombres"), max_length=100)
    last_name = models.CharField(_("Apellidos"), max_length=100)
    email = models.EmailField(_("Correo Electrónico"), unique=True, blank=True, null=True)
    phone = models.CharField(_("Teléfono"), max_length=15, blank=True)
    address = models.TextField(_("Dirección"), blank=True)
    
    # Campo para identificar el tipo de documento (DNI, RUC, etc.)
    document_type = models.CharField(_("Tipo de Documento"), max_length=20, blank=True)
    document_number = models.CharField(_("Número de Documento"), max_length=20, unique=True, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Relación con el usuario que creó o gestiona al cliente
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customers'
    )

    @property
    def full_name(self):
        """Devuelve el nombre completo del cliente."""
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def active_ventas(self):
        """Devuelve las ventas activas del cliente."""
        return self.ventas.filter(status='active')

    @property
    def total_active_ventas(self):
        """Devuelve el número total de ventas activas del cliente."""
        return self.active_ventas.count()

    @property
    def total_ventas_value(self):
        """Devuelve el valor total de todas las ventas del cliente."""
        from django.db.models import Sum
        return self.ventas.aggregate(
            total=Sum('sale_price')
        )['total'] or Decimal('0.00')

    @property
    def total_payments(self):
        """Devuelve el total de pagos realizados por el cliente a través de sus ventas."""
        from django.db.models import Sum
        # Sumar pagos de todas las ventas del cliente
        total_from_ventas = self.ventas.aggregate(
            total=Sum('payments__amount')
        )['total'] or Decimal('0.00')
        
        return total_from_ventas

    @property
    def total_pending_balance(self):
        """Devuelve el saldo total pendiente de todas las ventas activas del cliente."""
        # Calcular saldo pendiente de ventas activas
        active_ventas = self.ventas.filter(status='active')
        total_pending = sum(venta.remaining_balance for venta in active_ventas)
        
        return total_pending

    @property
    def payment_completion_percentage(self):
        """Devuelve el porcentaje de completitud de pagos del cliente."""
        total_payments = self.total_payments
        total_ventas_value = self.total_ventas_value
        
        if total_ventas_value > 0:
            return (total_payments / total_ventas_value) * 100
        return 0

    @cached_property
    def payment_summary(self):
        """Devuelve un resumen detallado de los pagos del cliente."""
        from django.db.models import Sum, Count
        
        # Estadísticas de ventas
        total_ventas = self.ventas.count()
        active_ventas = self.active_ventas.count()
        
        # Estadísticas de pagos
        total_payments_amount = self.total_payments
        total_payments_count = self.ventas.aggregate(
            count=Count('payments')
        )['count'] or 0
        
        # Estadísticas de cronogramas
        schedules = self.ventas.aggregate(
            total_schedules=Count('payment_schedules'),
            paid_schedules=Count('payment_schedules', filter=models.Q(payment_schedules__status='paid')),
            pending_schedules=Count('payment_schedules', filter=models.Q(payment_schedules__status='pending')),
            overdue_schedules=Count('payment_schedules', filter=models.Q(payment_schedules__status='overdue'))
        )
        
        return {
            'ventas': {
                'total': total_ventas,
                'active': active_ventas,
                'total_value': float(self.total_ventas_value)
            },
            'payments': {
                'total_amount': float(total_payments_amount),
                'total_count': total_payments_count
            },
            'schedules': {
                'total': schedules['total_schedules'],
                'paid': schedules['paid_schedules'],
                'pending': schedules['pending_schedules'],
                'overdue': schedules['overdue_schedules']
            },
            'completion_percentage': round(self.payment_completion_percentage, 2)
        }

    class Meta:
        verbose_name = _("Cliente")
        verbose_name_plural = _("Clientes")
        ordering = ['last_name', 'first_name']
        constraints = [
            models.UniqueConstraint(fields=['first_name', 'last_name'], name='unique_customer_name')
        ]

    def __str__(self):
        return self.full_name