from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from decimal import Decimal


class LoteQuerySet(models.QuerySet):
    """
    QuerySet personalizado para Lote con soporte para eliminación lógica.
    """
    def active(self):
        """Retorna solo los lotes activos (no eliminados)."""
        return self.filter(is_deleted=False)

    def deleted(self):
        """Retorna solo los lotes eliminados lógicamente."""
        return self.filter(is_deleted=True)

    def with_deleted(self):
        """Retorna todos los lotes incluyendo los eliminados."""
        return self

    def soft_delete(self, user=None, reason=""):
        """Eliminación lógica en lote para el queryset."""
        now = timezone.now()
        count = 0
        for lote in self:
            lote.soft_delete(user=user, reason=reason)
            count += 1
        return count

    def restore(self, user=None):
        """Restauración en lote para el queryset."""
        count = 0
        for lote in self:
            lote.restore(user=user)
            count += 1
        return count


class LoteManager(models.Manager.from_queryset(LoteQuerySet)):
    """
    Manager por defecto para Lote: filtra automáticamente los lotes eliminados.
    """
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class LoteAllManager(models.Manager.from_queryset(LoteQuerySet)):
    """
    Manager alternativo para Lote: incluye todos los lotes (activos y eliminados).
    Útil para reportes históricos, auditorías y trazabilidad.
    """
    def get_queryset(self):
        return super().get_queryset()


class Lote(models.Model):
    """
    Modelo para representar un lote o terreno con nueva arquitectura simplificada.
    Solo maneja información básica del lote. Las ventas se gestionan a través del modelo Venta.
    Soporta eliminación lógica (soft delete) para preservar integridad histórica y trazabilidad.
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

    # Campos para eliminación lógica (Soft Delete)
    is_deleted = models.BooleanField(
        _("Eliminado"),
        default=False,
        db_index=True,
        help_text=_("Indica si el lote fue retirado/eliminado lógicamente del inventario")
    )
    deleted_at = models.DateTimeField(
        _("Fecha de Eliminación"),
        null=True,
        blank=True,
        help_text=_("Fecha y hora en que se retiró el lote del inventario")
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lotes_eliminados',
        verbose_name=_("Eliminado por")
    )
    deletion_reason = models.TextField(
        _("Motivo de Eliminación"),
        blank=True,
        null=True,
        help_text=_("Motivo o justificación por el cual se retiró el lote")
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

    # Managers
    objects = LoteManager()
    all_objects = LoteAllManager()

    class Meta:
        verbose_name = _("Lote")
        verbose_name_plural = _("Lotes")
        ordering = ['block', 'lot_number']
        indexes = [
            models.Index(fields=['is_deleted', 'status'], name='lote_del_status_idx'),
            models.Index(fields=['is_deleted', 'block', 'lot_number'], name='lote_del_block_num_idx'),
        ]
        constraints = [
            # La unicidad de manzana y número de lote solo aplica a lotes activos
            models.UniqueConstraint(
                fields=['block', 'lot_number'],
                condition=models.Q(is_deleted=False),
                name='unique_active_lote'
            )
        ]

    def __str__(self):
        suffix = " (Eliminado)" if self.is_deleted else ""
        return f"Manzana {self.block}, Lote {self.lot_number}{suffix}"

    @property
    def display_name(self):
        """Devuelve el nombre completo del lote."""
        return f"Mz. {self.block} - Lt. {self.lot_number}"

    @property
    def is_available(self):
        """Verifica si el lote está disponible para venta (activo y en estado disponible)."""
        return not self.is_deleted and self.status == 'disponible'

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

    def soft_delete(self, user=None, reason=""):
        """
        Realiza la eliminación lógica del lote:
        - Lo marca como eliminado (is_deleted = True).
        - Registra fecha, usuario y motivo de eliminación.
        - Registra el evento en LoteHistory para auditoría.
        - Conserva todas las relaciones históricas con ventas, pagos, adendas, escrituras y clientes.
        """
        now = timezone.now()
        self.is_deleted = True
        self.deleted_at = now
        self.deleted_by = user
        self.deletion_reason = reason
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'deletion_reason', 'updated_at'])

        # Registrar en el historial para auditoría
        reason_text = f" Motivo: {reason}" if reason else ""
        user_name = user.get_full_name() or user.username if user else "Sistema"
        LoteHistory.objects.create(
            lote=self,
            user=user,
            action="Eliminación de Lote",
            details=f"Lote {self.display_name} retirado del inventario activo por {user_name}.{reason_text}"
        )
        return True

    def restore(self, user=None):
        """
        Restaura un lote eliminado lógicamente al inventario activo.
        - Verifica que no exista otro lote activo con la misma manzana y número.
        - Restablece is_deleted = False, deleted_at = None, deleted_by = None.
        - Registra el evento en LoteHistory para auditoría.
        """
        if not self.is_deleted:
            return True

        # Validar colisión con lotes activos existentes
        existing_active = Lote.objects.filter(
            block=self.block,
            lot_number=self.lot_number,
            is_deleted=False
        ).exclude(pk=self.pk)

        if existing_active.exists():
            raise ValidationError(
                _(f"No se puede restaurar el lote {self.display_name} porque ya existe otro lote activo con la misma Manzana y Número.")
            )

        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.deletion_reason = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'deletion_reason', 'updated_at'])

        user_name = user.get_full_name() or user.username if user else "Sistema"
        LoteHistory.objects.create(
            lote=self,
            user=user,
            action="Restauración de Lote",
            details=f"Lote {self.display_name} restaurado al inventario activo por {user_name}."
        )
        return True

    def delete(self, using=None, keep_parents=False):
        """
        Sobrescribe delete() para realizar eliminación lógica por defecto,
        evitando cualquier pérdida accidental de datos históricos.
        """
        return self.soft_delete()

    def hard_delete(self, using=None, keep_parents=False):
        """
        Eliminación física real en la base de datos (solo para casos excepcionales o mantenimiento).
        """
        return super().delete(using=using, keep_parents=keep_parents)


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