
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from customers.models import Customer

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
    price = models.DecimalField(_("Precio"), max_digits=12, decimal_places=2)
    
    status = models.CharField(
        _("Estado"),
        max_length=20,
        choices=STATUS_CHOICES,
        default='disponible'
    )
    
    # Relación con el cliente propietario
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

    class Meta:
        verbose_name = _("Lote")
        verbose_name_plural = _("Lotes")
        ordering = ['block', 'lot_number']
        constraints = [
            models.UniqueConstraint(fields=['block', 'lot_number'], name='unique_lote')
        ]

    def __str__(self):
        return f"Manzana {self.block}, Lote {self.lot_number}"