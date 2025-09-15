from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from decimal import Decimal

class Lote(models.Model):
    """
    Modelo para representar un lote o terreno con nueva arquitectura simplificada.
    Solo maneja información básica del lote. Las ventas se gestionan a través del modelo Venta.
    """
    STATUS_CHOICES = [
        ('disponible', _('Disponible')),
        ('vendido', _('Vendido')),
        ('reservado', _('Reservado')),
        ('liquidado', _('Liquidado')),
    ]

    block = models.CharField(_("Manzana"), max_length=50)
    lot_number = models.CharField(_("Número de Lote"), max_length=50)
    area = models.DecimalField(_("Área (m²)"), max_digits=10, decimal_places=2)
    price = models.DecimalField(_("Precio de Venta"), max_digits=12, decimal_places=2)
    
    status = models.CharField(
        _("Estado"),
        max_length=20,
        choices=STATUS_CHOICES,
        default='disponible'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lotes_creados'
    )

    class Meta:
        verbose_name = _("Lote")
        verbose_name_plural = _("Lotes")
        ordering = ['block', 'lot_number']
        constraints = [
            models.UniqueConstraint(fields=['block', 'lot_number'], name='unique_lote')
        ]

    def __str__(self):
        return f"Manzana {self.block}, Lote {self.lot_number}"

    @property
    def display_name(self):
        """Devuelve el nombre completo del lote."""
        return f"Mz. {self.block} - Lt. {self.lot_number}"

    @property
    def is_available(self):
        """Verifica si el lote está disponible para venta."""
        return self.status == 'disponible'

    @property
    def is_sold(self):
        """Verifica si el lote está vendido."""
        return self.status == 'vendido'

    @property
    def has_active_sale(self):
        """Verifica si el lote tiene una venta activa."""
        from sales.models import Venta
        return Venta.objects.filter(lote=self, status='active').exists()

    @property
    def active_sale(self):
        """Obtiene la venta activa del lote."""
        from sales.models import Venta
        return Venta.objects.filter(lote=self, status='active').first()

    @property
    def current_owner(self):
        """Obtiene el propietario actual del lote.
        - Si hay venta activa: devuelve su cliente
        - Si no hay venta activa pero hay ventas completadas: devuelve el cliente de la última completada
        - En otro caso: None
        """
        from sales.models import Venta
        active_sale = self.active_sale
        if active_sale:
            return active_sale.customer
        last_completed = Venta.objects.filter(lote=self, status='completed').order_by('-completion_date', '-created_at').first()
        return last_completed.customer if last_completed else None

    @property
    def remaining_balance(self):
        """Calcula el saldo restante del lote basado en la venta activa."""
        active_sale = self.active_sale
        if not active_sale:
            return self.price  # Si no hay venta activa, el saldo es el precio completo
        
        return active_sale.remaining_balance

    @property
    def total_payments(self):
        """Calcula el total de pagos realizados para la venta activa."""
        active_sale = self.active_sale
        if not active_sale:
            return Decimal('0.00')
        
        return active_sale.total_payments


    def get_sales_history(self):
        """Obtiene el historial de ventas del lote."""
        from sales.models import Venta
        return Venta.objects.filter(lote=self).order_by('-created_at')

    def get_payment_history(self):
        """Obtiene el historial de pagos del lote a través de sus ventas."""
        from sales.models import Venta
        from payments.models import Payment
        
        ventas = Venta.objects.filter(lote=self)
        return Payment.objects.filter(venta__in=ventas).order_by('-payment_date')

    def get_payment_schedules(self):
        """Obtiene los cronogramas de pago del lote a través de sus ventas."""
        from sales.models import Venta
        from payments.models import PaymentSchedule
        
        ventas = Venta.objects.filter(lote=self)
        return PaymentSchedule.objects.filter(venta__in=ventas).order_by('installment_number')

    def update_status_from_sales(self):
        """
        Actualiza el estado del lote basado en las ventas activas.
        Este método debe ser llamado desde el modelo Venta cuando cambie el estado de una venta.
        """
        active_sale = self.active_sale
        
        if active_sale:
            if active_sale.status == 'active':
                self.status = 'vendido'
            elif active_sale.status == 'completed':
                self.status = 'liquidado'
            elif active_sale.status == 'cancelled':
                self.status = 'disponible'
        else:
            # Si no hay venta activa, verificar si hay ventas completadas
            completed_sales = self.get_sales_history().filter(status='completed')
            if completed_sales.exists():
                self.status = 'liquidado'
            else:
                self.status = 'disponible'
        
        self.save(update_fields=['status'])


class LoteHistory(models.Model):
    """
    Modelo para registrar el historial de cambios de un lote.
    """
    lote = models.ForeignKey(Lote, on_delete=models.CASCADE, related_name='history')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_("Usuario que realizó el cambio")
    )
    action = models.CharField(_("Acción Realizada"), max_length=255)
    details = models.TextField(_("Detalles"), blank=True)
    timestamp = models.DateTimeField(_("Fecha y Hora"), auto_now_add=True)

    class Meta:
        verbose_name = _("Historial de Lote")
        verbose_name_plural = _("Historiales de Lotes")
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.timestamp.strftime("%Y-%m-%d %H:%M")} - {self.action}'