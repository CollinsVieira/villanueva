from django.db import models

from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Customer(models.Model):
    """
    Modelo para representar a un cliente.
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

    class Meta:
        verbose_name = _("Cliente")
        verbose_name_plural = _("Clientes")
        ordering = ['last_name', 'first_name']
        constraints = [
            models.UniqueConstraint(fields=['first_name', 'last_name'], name='unique_customer_name')
        ]

    def __str__(self):
        return self.full_name

    @property
    def full_name(self):
        """Devuelve el nombre completo del cliente."""
        return f"{self.first_name} {self.last_name}".strip()