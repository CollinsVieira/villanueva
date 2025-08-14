from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from customers.models import Customer
from django.db.models import Sum # <-- Añadir import

class Lote(models.Model):
    """
    Modelo para representar un lote o terreno.
    """
    STATUS_CHOICES = [
        ('disponible', _('Disponible')),
        ('vendido', _('Vendido')),
        ('reservado', _('Reservado')),
        ('desarrollo', _('En Desarrollo')),

        
    ]

    block = models.CharField(_("Manzana"), max_length=50)
    lot_number = models.CharField(_("Número de Lote"), max_length=50)
    area = models.DecimalField(_("Área (m²)"), max_digits=10, decimal_places=2)
    price = models.DecimalField(_("Precio de Venta (Saldo Inicial)"), max_digits=12, decimal_places=2)
    initial_payment = models.DecimalField(_("Pago Inicial (Enganche)"), max_digits=12, decimal_places=2, default=0.00)
    financing_months = models.PositiveIntegerField(_("Meses de Financiamiento"), default=0)
    
    status = models.CharField(
        _("Estado"),
        max_length=20,
        choices=STATUS_CHOICES,
        default='disponible'
    )
    
    owner = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lotes',
        verbose_name=_("Propietario")
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


    @property
    def remaining_balance(self):
        """Calcula el saldo restante del lote."""
        # Suma todos los objetos Payment relacionados a este lote
        total_paid_installments = self.payments.aggregate(total=Sum('amount'))['total'] or 0
        
        # El saldo restante es el precio MENOS el pago inicial MENOS la suma de las cuotas
        return self.price - self.initial_payment - total_paid_installments
    
    class Meta:
        verbose_name = _("Lote")
        verbose_name_plural = _("Lotes")
        ordering = ['block', 'lot_number']
        constraints = [
            models.UniqueConstraint(fields=['block', 'lot_number'], name='unique_lote')
        ]

    def __str__(self):
        return f"Manzana {self.block}, Lote {self.lot_number}"


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