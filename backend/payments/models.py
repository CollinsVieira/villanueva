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
    
    payment_date = models.DateTimeField(_("Fecha de Pago"))
    
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
        """Retorna True si el pago está vencido basado en el payment_day del lote."""
        if not self.payment_date and self.payment_type == 'installment':
            # Calcular la fecha de vencimiento basada en el payment_day del lote
            today = date.today()
            current_due_date = today.replace(day=min(self.lote.payment_day, 28))
            
            # Si estamos después del día de pago de este mes, está vencido
            return today > current_due_date
        return False

    @property
    def days_overdue(self):
        """Retorna el número de días de atraso basado en la fecha de vencimiento real."""
        if self.is_overdue:
            today = date.today()
            return (today - self.due_date).days
        return 0

    @property
    def due_date(self):
        """
        Calcula la fecha de vencimiento basada en la secuencia real de pagos.
        
        Lógica:
        - Si es la cuota 1: vence según payment_day del mes de creación del lote
        - Si hay cuotas anteriores pagadas: vence en el mes siguiente a la última cuota pagada
        - Siempre usar el payment_day del lote como día de vencimiento
        - Manejar casos donde el día no existe en el mes
        """
        if self.payment_type != 'installment':
            return None
            
        if not self.installment_number:
            return None
            
        # Obtener el payment_day del lote
        payment_day = self.lote.payment_day
        
        if self.installment_number == 1:
            # Primera cuota: vence en el mes de creación del lote
            return self._get_due_date_for_month(
                self.lote.created_at.date().replace(day=1),
                payment_day
            )
        else:
            # Cuotas posteriores: vencen en el mes siguiente a la última cuota pagada
            last_paid_payment = self._get_last_paid_payment()
            if last_paid_payment:
                # Calcular el mes siguiente a la fecha de pago de la última cuota
                next_month_date = self._get_next_month_date(last_paid_payment.payment_date.date())
                return self._get_due_date_for_month(next_month_date, payment_day)
            else:
                # Fallback: usar la fecha de creación del lote
                return self._get_due_date_for_month(
                    self.lote.created_at.date().replace(day=1),
                    payment_day
                )

    def _get_last_paid_payment(self):
        """
        Obtiene la última cuota pagada anterior a esta.
        """
        if not self.installment_number or self.installment_number <= 1:
            return None
            
        return self.lote.payments.filter(
            payment_type='installment',
            installment_number__lt=self.installment_number,
            payment_date__isnull=False
        ).order_by('-installment_number').first()

    def _get_next_month_date(self, current_date):
        """
        Calcula la fecha del mes siguiente, manejando cambios de año.
        """
        if current_date.month == 12:
            return current_date.replace(year=current_date.year + 1, month=1)
        else:
            return current_date.replace(month=current_date.month + 1)

    def _get_due_date_for_month(self, month_date, payment_day):
        """
        Calcula la fecha de vencimiento para un mes específico,
        manejando casos donde el día no existe en el mes.
        """
        try:
            # Intentar usar el payment_day exacto
            return month_date.replace(day=payment_day)
        except ValueError:
            # Si el día no existe en el mes, usar el último día del mes
            if month_date.month == 12:
                next_month = month_date.replace(year=month_date.year + 1, month=1)
            else:
                next_month = month_date.replace(month=month_date.month + 1)
            
            last_day_of_month = next_month.replace(day=1) - timedelta(days=1)
            return last_day_of_month

    @classmethod
    def calculate_next_due_date(cls, lote, next_installment_number):
        """
        Método de clase para calcular la próxima fecha de vencimiento
        sin crear una instancia del modelo.
        """
        if not lote or not lote.payment_day or not next_installment_number:
            return None
            
        payment_day = lote.payment_day
        
        if next_installment_number == 1:
            # Primera cuota: vence en el mes de creación del lote
            return cls._calculate_due_date_for_month_static(
                lote.created_at.date().replace(day=1),
                payment_day
            )
        else:
            # Cuotas posteriores: vencen en el mes siguiente a la última cuota pagada
            last_paid_payment = cls._get_last_paid_payment_static(lote, next_installment_number)
            if last_paid_payment:
                # Calcular el mes siguiente a la fecha de pago de la última cuota
                next_month_date = cls._calculate_next_month_date_static(last_paid_payment.payment_date.date())
                return cls._calculate_due_date_for_month_static(next_month_date, payment_day)
            else:
                # Fallback: usar la fecha de creación del lote
                return cls._calculate_due_date_for_month_static(
                    lote.created_at.date().replace(day=1),
                    payment_day
                )

    @staticmethod
    def _get_last_paid_payment_static(lote, current_installment_number):
        """
        Método estático para obtener la última cuota pagada anterior.
        """
        if not current_installment_number or current_installment_number <= 1:
            return None
            
        return lote.payments.filter(
            payment_type='installment',
            installment_number__lt=current_installment_number,
            payment_date__isnull=False
        ).order_by('-installment_number').first()

    @staticmethod
    def _calculate_next_month_date_static(current_date):
        """
        Método estático para calcular la fecha del mes siguiente.
        """
        if current_date.month == 12:
            return current_date.replace(year=current_date.year + 1, month=1)
        else:
            return current_date.replace(month=current_date.month + 1)

    @staticmethod
    def _calculate_due_date_for_month_static(month_date, payment_day):
        """
        Método estático para calcular la fecha de vencimiento para un mes específico.
        """
        try:
            # Intentar usar el payment_day exacto
            return month_date.replace(day=payment_day)
        except ValueError:
            # Si el día no existe en el mes, usar el último día del mes
            if month_date.month == 12:
                next_month = month_date.replace(year=month_date.year + 1, month=1)
            else:
                next_month = month_date.replace(month=month_date.month + 1)
            
            last_day_of_month = next_month.replace(day=1) - timedelta(days=1)
            return last_day_of_month

    @property
    def is_overdue(self):
        """Retorna True si el pago está vencido basado en la fecha de vencimiento real."""
        if not self.due_date:
            return False
        return date.today() > self.due_date


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
        Crea registros de Payment para cada cuota sin fecha de vencimiento específica.
        """
        # Limpiar pagos existentes del plan (solo los no pagados)
        self.payments.filter(payment_date__isnull=True).delete()
        
        monthly_amount = self.lote.monthly_installment
        financing_months = self.lote.financing_months
        
        if financing_months <= 0 or monthly_amount <= 0:
            return
        
        # Generar cuotas mensuales
        for i in range(1, financing_months + 1):
            Payment.objects.create(
                lote=self.lote,
                amount=monthly_amount,
                payment_plan=self,
                installment_number=i,
                method='transferencia',  # Valor por defecto
                recorded_by=None  # Se asignará cuando se realice el pago
            )

    def get_payment_status(self):
        """
        Retorna estadísticas del plan de pagos.
        """
        total_payments = self.payments.count()
        paid_payments = self.payments.filter(payment_date__isnull=False).count()
        
        # Calcular pagos vencidos basado en el payment_day del lote
        today = date.today()
        current_due_date = today.replace(day=min(self.lote.payment_day, 28))
        overdue_payments = self.payments.filter(
            payment_date__isnull=True,
            payment_type='installment'
        ).count() if today > current_due_date else 0
        
        return {
            'total': total_payments,
            'paid': paid_payments,
            'pending': total_payments - paid_payments,
            'overdue': overdue_payments,
            'completion_percentage': (paid_payments / total_payments * 100) if total_payments > 0 else 0
        }