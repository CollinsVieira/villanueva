from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils.translation import gettext_lazy as _
from lotes.models import Lote

class Payment(models.Model):
    """
    Modelo para representar un pago realizado por un lote.
    """
    METHOD_CHOICES = [
        ('efectivo', _('Efectivo')),
        ('transferencia', _('Transferencia Bancaria')),
        ('tarjeta', _('Tarjeta de Crédito/Débito')),
        ('otro', _('Otro')),
    ]

    receipt_image = models.ImageField(_("Imagen del Comprobante"), upload_to='payment_receipts/', blank=True, null=True)
    installment_number = models.PositiveIntegerField(_("Número de Cuota"), blank=True, null=True)


    # Relación con el lote al que corresponde el pago
    lote = models.ForeignKey(
        Lote,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name=_("Lote")
        
        
    )
    
    amount = models.DecimalField(
        _("Monto del Pago"),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    
    payment_date = models.DateField(_("Fecha de Pago"))
    
    method = models.CharField(
        _("Método de Pago"),
        max_length=20,
        choices=METHOD_CHOICES,
        default='transferencia'
    )
    
    receipt_number = models.CharField(_("Número de Recibo/Referencia"), max_length=100, blank=True)
    notes = models.TextField(_("Notas Adicionales"), blank=True)

    # Relación con el usuario que registró el pago
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_payments'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Pago")
        verbose_name_plural = _("Pagos")
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"Pago de {self.amount} para {self.lote} el {self.payment_date}"