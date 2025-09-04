from django.db import models
from django.conf import settings
from django.db.models import Sum
from django.utils.translation import gettext_lazy as _
from datetime import date
from customers.models import Customer

class Lote(models.Model):
    """
    Modelo para representar un lote o terreno.
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
    price = models.DecimalField(_("Precio de Venta (Saldo Inicial)"), max_digits=12, decimal_places=2)
    initial_payment = models.DecimalField(_("Pago Inicial (Enganche)"), max_digits=12, decimal_places=2, default=0.00)
    financing_months = models.PositiveIntegerField(_("Meses de Financiamiento"), default=0)
    payment_day = models.PositiveIntegerField(
        _("Día de Vencimiento Mensual"), 
        default=15, 
        help_text=_("Día del mes en que vencen las cuotas (1-31)")
    )
    
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

    contract_file = models.FileField(
        _("Contrato PDF"),
        upload_to='contracts/',
        null=True,
        blank=True
    )
    
    contract_date = models.DateTimeField(
        _("Fecha de Contrato"),
        null=True,
        blank=True
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
    def remaining_balance(self):
        """Calcula el saldo restante del lote."""
        total_paid_amount = self.payments.aggregate(total=Sum('amount'))['total'] or 0
        return self.price - total_paid_amount
        
    @property
    def installments_paid(self):
        """Calcula el número de pagos de cuotas registrados (solo tipo 'installment')."""
        return self.payments.filter(payment_type='installment').count()

    @property
    def monthly_installment(self):
        """Calcula el monto de la cuota mensual."""
        if self.financing_months and self.financing_months > 0:
            # El monto a financiar es el precio total menos el enganche configurado
            # No usamos remaining_balance porque puede incluir pagos adicionales
            amount_to_finance = self.price - self.initial_payment
            return round(amount_to_finance / self.financing_months, 2)
        return 0
    
    @property
    def has_initial_payment(self):
        """Verifica si ya se realizó el pago inicial."""
        return self.payments.filter(payment_type='initial').exists()
    
    @property
    def initial_payment_amount(self):
        """Obtiene el monto del pago inicial ya realizado."""
        initial_payment = self.payments.filter(payment_type='initial').first()
        return initial_payment.amount if initial_payment else 0 

    def save(self, *args, **kwargs):
        """
        Sobrescribe el método save para actualizar el estado automáticamente.
        """
        # Verificar si es la primera vez que se asigna un propietario
        is_new_owner = False
        if self.pk:  # Si el lote ya existe
            old_lote = Lote.objects.get(pk=self.pk)
            is_new_owner = (not old_lote.owner and self.owner)
        else:
            is_new_owner = bool(self.owner)
        
        if self.owner:
            # Si tiene propietario, verificar si ha pagado completamente
            if self.remaining_balance <= 0:
                self.status = 'liquidado'
            else:
                self.status = 'vendido'
        else:
            self.status = 'disponible'
        
        super().save(*args, **kwargs)
        
        # Generar plan de pagos y registrar pago inicial si se asignó un nuevo propietario
        if is_new_owner and self.financing_months > 0:
            self.create_payment_plan()
            # Registrar pago inicial solo si no hay uno ya registrado
            if self.initial_payment > 0 and not self.has_initial_payment:
                self.register_initial_payment()

    def create_payment_plan(self, payment_day=None):
        """
        Crea un plan de pagos para este lote.
        """
        from payments.models import PaymentPlan  # Import aquí para evitar circular imports
        
        # Eliminar plan existente si existe
        if hasattr(self, 'payment_plan'):
            self.payment_plan.delete()
        
        # Usar el payment_day del lote o el parámetro pasado
        if payment_day is None:
            payment_day = self.payment_day
        
        # Crear nuevo plan de pagos
        payment_plan = PaymentPlan.objects.create(
            lote=self,
            start_date=date.today(),
            payment_day=payment_day
        )
        
        # Generar cronograma de pagos
        payment_plan.generate_payment_schedule()
        
        return payment_plan
    
    def register_initial_payment(self):
        """
        Registra automáticamente el pago inicial como un pago de tipo 'initial'.
        """
        from payments.models import Payment  # Import aquí para evitar circular imports
        from django.utils import timezone
        
        # Verificar si ya existe un pago inicial para este lote
        if not self.has_initial_payment and self.initial_payment > 0:
            # Crear el pago inicial
            Payment.objects.create(
                lote=self,
                amount=self.initial_payment,
                payment_date=timezone.now().date(),
                method='transferencia',  # Default method
                payment_type='initial',
                notes='Pago inicial registrado automáticamente al asignar el lote'
            )


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