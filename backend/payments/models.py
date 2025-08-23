from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils.translation import gettext_lazy as _
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
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
    
    PAYMENT_TYPE_CHOICES = [
        ('initial', _('Pago Inicial/Enganche')),
        ('installment', _('Cuota Mensual')),
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
    
    payment_type = models.CharField(
        _("Tipo de Pago"),
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES,
        default='installment'
    )
    
    receipt_number = models.CharField(_("Número de Operación"), max_length=100, blank=True)
    receipt_date = models.DateField(_("Fecha de Operación"), blank=True, null=True)
    notes = models.TextField(_("Notas Adicionales"), blank=True)
    
    # Fecha de vencimiento de esta cuota
    due_date = models.DateField(_("Fecha de Vencimiento"), blank=True, null=True)
    
    # Relación con el plan de pagos
    payment_plan = models.ForeignKey(
        'PaymentPlan',
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name=_("Plan de Pagos"),
        blank=True,
        null=True
    )

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

    def save(self, *args, **kwargs):
        """
        Sobrescribe el método save para actualizar el estado del lote después de registrar un pago.
        """
        super().save(*args, **kwargs)
        # Actualizar el estado del lote después de guardar el pago
        self.lote.save()

    def delete(self, *args, **kwargs):
        """
        Sobrescribe el método delete para actualizar el estado del lote después de eliminar un pago.
        """
        lote = self.lote
        super().delete(*args, **kwargs)
        # Actualizar el estado del lote después de eliminar el pago
        lote.save()

    def __str__(self):
        return f"Pago de {self.amount} para {self.lote} el {self.payment_date}"

    @property
    def is_overdue(self):
        """Retorna True si el pago está vencido."""
        if self.due_date and not self.payment_date:
            return date.today() > self.due_date
        return False

    @property
    def days_overdue(self):
        """Retorna el número de días de atraso."""
        if self.is_overdue:
            return (date.today() - self.due_date).days
        return 0


class PaymentPlan(models.Model):
    """
    Modelo para representar un plan de pagos de un lote.
    Se genera automáticamente cuando se asigna un propietario a un lote.
    """
    lote = models.OneToOneField(
        Lote,
        on_delete=models.CASCADE,
        related_name='payment_plan',
        verbose_name=_("Lote")
    )
    
    start_date = models.DateField(_("Fecha de Inicio"))
    payment_day = models.PositiveIntegerField(
        _("Día de Pago Mensual"),
        default=13,
        help_text=_("Día del mes en que vence cada cuota (1-31)")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Plan de Pagos")
        verbose_name_plural = _("Planes de Pagos")

    def __str__(self):
        return f"Plan de Pagos para {self.lote}"

    def generate_payment_schedule(self):
        """
        Genera el cronograma de pagos para este lote.
        Crea registros de Payment con fecha de vencimiento para cada cuota.
        """
        # Limpiar pagos existentes del plan (solo los no pagados)
        self.payments.filter(payment_date__isnull=True).delete()
        
        monthly_amount = self.lote.monthly_installment
        financing_months = self.lote.financing_months
        
        if financing_months <= 0 or monthly_amount <= 0:
            return
        
        # Generar cuotas mensuales
        current_date = self.start_date
        for i in range(1, financing_months + 1):
            # Calcular fecha de vencimiento (día específico del mes)
            due_date = current_date.replace(day=min(self.payment_day, 28))  # Evitar problemas con febrero
            
            Payment.objects.create(
                lote=self.lote,
                amount=monthly_amount,
                payment_plan=self,
                installment_number=i,
                due_date=due_date,
                method='transferencia',  # Valor por defecto
                recorded_by=None  # Se asignará cuando se realice el pago
            )
            
            # Avanzar al siguiente mes
            current_date = current_date + relativedelta(months=1)

    def get_payment_status(self):
        """
        Retorna estadísticas del plan de pagos.
        """
        total_payments = self.payments.count()
        paid_payments = self.payments.filter(payment_date__isnull=False).count()
        overdue_payments = self.payments.filter(
            due_date__lt=date.today(),
            payment_date__isnull=True
        ).count()
        
        return {
            'total': total_payments,
            'paid': paid_payments,
            'pending': total_payments - paid_payments,
            'overdue': overdue_payments,
            'completion_percentage': (paid_payments / total_payments * 100) if total_payments > 0 else 0
        }