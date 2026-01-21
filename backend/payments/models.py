from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from lotes.models import Lote
from customers.models import Customer

class Payment(models.Model):
    """
    Modelo para representar un pago realizado por una venta.
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

    # Relación con la venta a la que corresponde el pago
    venta = models.ForeignKey(
        'sales.Venta',
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name=_("Venta")
    )
    
    # Relación con el cronograma de pagos (opcional, para cuotas)
    payment_schedule = models.ForeignKey(
        'PaymentSchedule',
        on_delete=models.SET_NULL,
        related_name='schedule_payments',
        verbose_name=_("Cronograma de Pago"),
        null=True,
        blank=True
    )
    
    amount = models.DecimalField(
        _("Monto del Pago"),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
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
    receipt_image = models.ImageField(_("Imagen del Comprobante"), upload_to='payment_receipts/', blank=True, null=True)
    boleta_image = models.ImageField(_("Boleta de Pago"), upload_to='boleta_pagos/', blank=True, null=True)
    notes = models.TextField(_("Notas Adicionales"), blank=True, null=True)

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
        # Actualizar el estado del lote a través de la venta
        if self.venta and hasattr(self.venta, 'lote') and self.venta.lote:
            self.venta.lote.save()

    def delete(self, *args, **kwargs):
        """
        Sobrescribe el método delete para actualizar el estado del lote después de eliminar un pago.
        """
        venta_lote = None
        if self.venta and hasattr(self.venta, 'lote') and self.venta.lote:
            venta_lote = self.venta.lote
        
        super().delete(*args, **kwargs)
        # Actualizar el estado del lote después de eliminar el pago
        if venta_lote:
            venta_lote.save()

    def __str__(self):
        lote_display = "Sin lote"
        if self.venta and hasattr(self.venta, 'lote') and self.venta.lote:
            lote_display = str(self.venta.lote)
        return f"Pago de {self.amount} para Venta #{self.venta.id if self.venta else 'N/A'} ({lote_display}) el {self.payment_date}"





class PaymentPlan(models.Model):
    """
    Modelo para representar un plan de pagos de una venta específica.
    Cada venta tiene su propio plan de pagos independiente.
    """
    venta = models.OneToOneField(
        'sales.Venta',
        on_delete=models.CASCADE,
        related_name='plan_pagos',
        verbose_name=_("Venta")
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
        return f"Plan de Pagos para Venta #{self.venta.id} - {self.venta.lote}"

    def generate_payment_schedule(self):
        """
        Genera el cronograma de pagos para esta venta.
        Ahora delega la creación al modelo PaymentSchedule.
        """
        # Usar el método del PaymentSchedule que es la fuente de verdad
        return PaymentSchedule.generate_schedule_for_venta(self.venta)

    def get_payment_status(self):
        """
        Retorna estadísticas del plan de pagos basado en PaymentSchedule.
        """
        # Usar PaymentSchedule como fuente de verdad
        schedules = self.venta.payment_schedules.all()
        
        total_payments = schedules.count()
        paid_payments = schedules.filter(status='paid').count()
        forgiven_payments = schedules.filter(status='forgiven').count()
        overdue_payments = schedules.filter(status='overdue').count()
        partial_payments = schedules.filter(status='partial').count()
        
        # Calcular montos totales
        from django.db.models import Sum
        total_scheduled_amount = schedules.aggregate(
            total=Sum('scheduled_amount')
        )['total'] or Decimal('0.00')
        
        total_paid_amount = schedules.aggregate(
            total=Sum('paid_amount')
        )['total'] or Decimal('0.00')
        
        # Calcular monto restante desde la venta (excluye cuotas perdonadas)
        remaining_amount = self.venta.remaining_balance
        
        # Las cuotas absueltas cuentan como "completadas" para el porcentaje
        completed_payments = paid_payments + forgiven_payments
        
        return {
            'total': total_payments,
            'paid': paid_payments,
            'pending': schedules.filter(status='pending').count(),
            'overdue': overdue_payments,
            'partial': partial_payments,
            'forgiven': forgiven_payments,
            'completion_percentage': round((completed_payments / total_payments * 100), 1) if total_payments > 0 else 0,
            'total_installments': total_payments,
            'remaining_amount': str(remaining_amount),
            'paid_amount': str(total_paid_amount)
        }
    
    @property
    def is_completed(self):
        """Verifica si el plan de pagos está completado"""
        status = self.get_payment_status()
        return status['completion_percentage'] >= 100


class PaymentSchedule(models.Model):
    """
    Modelo para representar el cronograma detallado de pagos de un lote.
    Cada registro representa una cuota específica con flexibilidad para pagos parciales,
    cuotas absueltas y modificaciones del cronograma.
    """
    STATUS_CHOICES = [
        ('pending', _('Pendiente')),
        ('paid', _('Pagado')),
        ('overdue', _('Vencido')),
        ('partial', _('Pago Parcial')),
        ('forgiven', _('Absuelto')),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('efectivo', _('Efectivo')),
        ('transferencia', _('Transferencia Bancaria')),
        ('tarjeta', _('Tarjeta de Crédito/Débito')),
        ('otro', _('Otro')),
    ]

    venta = models.ForeignKey(
        'sales.Venta',
        on_delete=models.CASCADE,
        related_name='payment_schedules',
        verbose_name=_("Venta")
    )
    
    installment_number = models.PositiveIntegerField(_("Número de Cuota"))
    
    # Montos flexibles
    original_amount = models.DecimalField(
        _("Monto Original"),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text=_("Monto original programado al crear el cronograma")
    )
    
    scheduled_amount = models.DecimalField(
        _("Monto Programado Actual"),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text=_("Monto actual a pagar (puede ser diferente al original)")
    )
    
    paid_amount = models.DecimalField(
        _("Monto Pagado"),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(0)]
    )
    
    # Fechas
    due_date = models.DateField(_("Fecha de Vencimiento"))
    payment_date = models.DateTimeField(
        _("Fecha de Pago"),
        null=True,
        blank=True,
        help_text=_("Fecha en que se realizó el pago")
    )
    
    # Información del pago
    receipt_image = models.ImageField(
        _("Imagen del Comprobante"),
        upload_to='payment_receipts/',
        blank=True,
        null=True
    )
    boleta_image = models.ImageField(
        _("Boleta de Pago"),
        upload_to='boleta_pagos/',
        blank=True,
        null=True
    )
    receipt_number = models.CharField(
        _("Número de Operación"),
        max_length=100,
        blank=True,
        null=True
    )
    receipt_date = models.DateField(
        _("Fecha de Operación"),
        blank=True,
        null=True
    )
    payment_method = models.CharField(
        _("Método de Pago"),
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        blank=True,
        null=True
    )
    
    # Estado y flexibilidad
    status = models.CharField(
        _("Estado"),
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    is_forgiven = models.BooleanField(
        _("Cuota Absuelto"),
        default=False,
        help_text=_("Marca si esta cuota ha sido perdonada/regalada")
    )
    
    notes = models.TextField(
        _("Notas"),
        blank=True,
        help_text=_("Notas adicionales sobre cambios o situaciones especiales")
    )
    
    # Relación con pagos realizados
    payments = models.ManyToManyField(
        'Payment',
        blank=True,
        related_name='payment_schedules',
        verbose_name=_("Pagos Asociados"),
        help_text=_("Pagos que se han aplicado a esta cuota del cronograma")
    )
    
    # Auditoría
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_schedule_payments',
        verbose_name=_("Registrado por")
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def lote(self):
        """Acceso al lote a través de la venta"""
        return self.venta.lote
    
    @property
    def customer(self):
        """Acceso al cliente a través de la venta"""
        return self.venta.customer

    class Meta:
        verbose_name = _("Cronograma de Pago")
        verbose_name_plural = _("Cronogramas de Pago")
        ordering = ['venta', 'installment_number']
        constraints = [
            models.UniqueConstraint(
                fields=['venta', 'installment_number'], 
                name='unique_venta_installment'
            )
        ]

    def __str__(self):
        return f"Cuota {self.installment_number} - Venta #{self.venta.id} ({self.venta.lote}) - Vence: {self.due_date}"

    def save(self, *args, **kwargs):
        """
        Actualiza el estado automáticamente basado en los pagos y fechas.
        """
        # La venta ya maneja la consistencia entre lote y customer
            
        # Calcular paid_amount desde los pagos asociados si ya existe en la BD,
        # excepto cuando la cuota está perdonada (se considera totalmente pagada)
        if self.pk:
            if self.is_forgiven:
                # Asegurar consistencia: una cuota perdonada cuenta como cancelada
                self.paid_amount = self.scheduled_amount
                if not self.payment_date:
                    self.payment_date = timezone.now()
            else:
                from django.db.models import Sum
                total_paid = self.payments.aggregate(
                    total=Sum('amount')
                )['total'] or Decimal('0.00')
                self.paid_amount = total_paid
        
        # Actualizar estado automáticamente
        if self.is_forgiven:
            self.status = 'forgiven'
        elif self.paid_amount >= self.scheduled_amount:
            self.status = 'paid'
        elif self.paid_amount > 0:
            self.status = 'partial'
        elif date.today() > self.due_date:
            self.status = 'overdue'
        else:
            self.status = 'pending'
        
        super().save(*args, **kwargs)

    @property
    def remaining_amount(self):
        """Calcula el monto restante por pagar."""
        if self.is_forgiven:
            return Decimal('0.00')
        return max(0, self.scheduled_amount - self.paid_amount)

    @property
    def is_overdue(self):
        """Verifica si la cuota está vencida."""
        return date.today() > self.due_date and self.status != 'paid'

    @property
    def days_overdue(self):
        """Calcula los días de atraso."""
        if self.is_overdue:
            return (date.today() - self.due_date).days
        return 0

    @classmethod
    def generate_schedule_for_venta(cls, venta):
        """
        Genera el cronograma completo de pagos para una venta específica.
        """
        lote = venta.lote
        if not venta.customer or venta.financing_months <= 0:
            return []

        # No eliminar cronogramas existentes - cada venta tiene su propio cronograma
        # Solo verificar que no exista ya un cronograma para esta venta
        existing = cls.objects.filter(venta=venta).exists()
        if existing:
            return cls.objects.filter(venta=venta).order_by('installment_number')

        # Calcular el monto mensual basado en el precio de venta menos el pago inicial (independiente de si se pagó o no)
        # Las cuotas mensuales se calculan sobre el saldo después del pago inicial
        remaining_amount = venta.sale_price - venta.initial_payment
        
        # Calcular el monto base para las primeras cuotas (redondeado hacia abajo a números enteros)
        monthly_amount_base = (remaining_amount / venta.financing_months).quantize(Decimal('1'), rounding='ROUND_DOWN')
        
        # Calcular la diferencia que debe absorber la última cuota
        total_base_amount = monthly_amount_base * (venta.financing_months - 1)
        last_installment_amount = remaining_amount - total_base_amount
        
        # Usar payment_day de la venta o un valor por defecto
        payment_day = getattr(venta, 'payment_day', 15)
        
        # Usar la fecha de inicio del cronograma si está especificada, sino usar la fecha de venta
        if venta.schedule_start_date:
            start_date = venta.schedule_start_date
        else:
            start_date = venta.sale_date.date()

        schedules = []
        
        for i in range(1, venta.financing_months + 1):
            # Calcular fecha de vencimiento para cada cuota
            due_date = cls._calculate_due_date(start_date, i, payment_day)
            
            # La última cuota absorbe cualquier diferencia decimal
            if i == venta.financing_months:
                installment_amount = last_installment_amount
            else:
                installment_amount = monthly_amount_base
            
            schedule = cls.objects.create(
                venta=venta,
                installment_number=i,
                original_amount=installment_amount,
                scheduled_amount=installment_amount,
                due_date=due_date
            )
            schedules.append(schedule)

        return schedules
    
    @classmethod
    def generate_schedule_for_lote(cls, lote):
        """
        Método de compatibilidad - busca la venta activa y genera el cronograma.
        """
        from sales.models import Venta
        active_sale = Venta.get_active_sale_for_lote(lote)
        if active_sale:
            return cls.generate_schedule_for_venta(active_sale)
        return []
    
    @classmethod
    def transfer_ownership(cls, lote, old_owner, new_owner):
        """
        DEPRECATED: Este método ya no es necesario con el nuevo modelo de Venta.
        La transferencia de propiedad ahora se maneja cancelando la venta anterior
        y creando una nueva venta para el nuevo propietario.
        """
        # Con el nuevo modelo, esto se maneja a nivel de Venta
        # 1. Cancelar venta anterior: venta.cancel_sale()
        # 2. Crear nueva venta: Venta.create_sale(lote, new_owner, ...)
        pass
    
    def register_payment(self, amount, payment_date=None, payment_method='transferencia', 
                        receipt_number=None, receipt_date=None, receipt_image=None, 
                        boleta_image=None, notes=None, recorded_by=None):
        """
        Registra un pago para esta cuota del cronograma.
        """
        from django.utils import timezone
        from decimal import Decimal
        
        if payment_date is None:
            payment_date = timezone.now()
        
        # Crear el objeto Payment correspondiente
        payment = Payment.objects.create(
            venta=self.venta,
            payment_schedule=self,
            amount=Decimal(str(amount)),
            payment_date=payment_date,
            method=payment_method,
            receipt_number=receipt_number or '',
            receipt_date=receipt_date,
            receipt_image=receipt_image,
            notes=notes or '',
            recorded_by=recorded_by,
            payment_type='installment'
        )
        
        # Asociar el pago a esta cuota del cronograma usando el método add_payment
        self.add_payment(payment)
        
        # Asignar boleta_image si se proporciona
        if boleta_image:
            self.boleta_image = boleta_image
            self.save()
        
        return self
    
    def forgive_installment(self, notes=None, recorded_by=None):
        """
        Marca esta cuota como absuelta/perdonada.
        Esto reduce la deuda total del lote automáticamente.
        """
        self.is_forgiven = True
        self.status = 'forgiven'
        self.recorded_by = recorded_by
        # Considerar la cuota como cancelada al 100%
        self.paid_amount = self.scheduled_amount
        if not self.payment_date:
            self.payment_date = timezone.now()
        
        if notes:
            if self.notes:
                self.notes += f"\n{notes}"
            else:
                self.notes = notes
                
        self.save()
        
        # Actualizar el estado del lote para recalcular el saldo
        self.lote.save()
        
        return self
    
    def modify_amount(self, new_amount, notes=None, recorded_by=None):
        """
        Modifica el monto programado de esta cuota y redistribuye automáticamente
        el saldo restante entre las demás cuotas pendientes para mantener el total
        del cronograma igual al saldo objetivo de la venta.
        """
        old_amount = self.scheduled_amount
        self.scheduled_amount = new_amount
        self.recorded_by = recorded_by
        
        modification_note = f"Monto modificado de {old_amount} a {new_amount}"
        if notes:
            modification_note += f" - {notes}"
            
        if self.notes:
            self.notes += f"\n{modification_note}"
        else:
            self.notes = modification_note
            
        self.save()
        
        # Redistribuir automáticamente las demás cuotas pendientes
        self._redistribute_remaining_installments()
        
        return self
    
    def _redistribute_remaining_installments(self):
        """
        Redistribuye automáticamente el saldo restante entre las cuotas pendientes
        (excluyendo cuotas pagadas, parciales y perdonadas) para mantener el total
        del cronograma igual al saldo objetivo de la venta.
        """
        try:
            # Calcular el saldo objetivo total (precio de venta - pago inicial)
            target_total = self.venta.sale_price - self.venta.initial_payment
            
            # Obtener todas las cuotas de esta venta
            all_schedules = self.venta.payment_schedules.all().order_by('installment_number')
            
            # Separar cuotas que NO se pueden modificar (pagadas, parciales, perdonadas)
            # de las que SÍ se pueden redistribuir (pendientes y vencidas)
            # EXCLUIR la cuota actual que se está modificando de la redistribución
            fixed_schedules = all_schedules.filter(
                status__in=['paid', 'partial', 'forgiven']
            )
            redistributable_schedules = all_schedules.filter(
                status__in=['pending', 'overdue']
            ).exclude(id=self.id)  # Excluir la cuota actual
            
            # Calcular el monto total ya "fijo" (cuotas que no se pueden cambiar + cuota actual)
            from django.db.models import Sum
            fixed_total = fixed_schedules.aggregate(
                total=Sum('scheduled_amount')
            )['total'] or Decimal('0.00')
            
            # Agregar el monto de la cuota actual (que ya fue modificada)
            fixed_total += self.scheduled_amount
            
            # El saldo restante a distribuir entre las cuotas redistributables
            remaining_to_distribute = target_total - fixed_total
            
            # Contar cuántas cuotas se pueden redistribuir
            redistributable_count = redistributable_schedules.count()
            
            if redistributable_count > 0 and remaining_to_distribute > 0:
                # Calcular el monto base para cada cuota redistributable (redondeado hacia abajo)
                base_amount = (remaining_to_distribute / redistributable_count).quantize(
                    Decimal('1'), rounding='ROUND_DOWN'
                )
                
                # Calcular cuánto sobra para ajustar en la última cuota redistributable
                total_base = base_amount * (redistributable_count - 1)
                last_amount = remaining_to_distribute - total_base
                
                # Aplicar la redistribución
                redistributable_list = list(redistributable_schedules)
                for i, schedule in enumerate(redistributable_list):
                    if i == len(redistributable_list) - 1:  # Última cuota
                        new_amount = last_amount
                    else:
                        new_amount = base_amount
                    
                    # Solo actualizar si el monto cambió y es mayor o igual a 0.01
                    if schedule.scheduled_amount != new_amount and new_amount >= Decimal('0.01'):
                        schedule.scheduled_amount = new_amount
                        
                        # Agregar nota de redistribución automática
                        redistribution_note = f"Redistribución automática: nuevo monto {new_amount}"
                        if schedule.notes:
                            schedule.notes += f"\n{redistribution_note}"
                        else:
                            schedule.notes = redistribution_note
                        
                        schedule.save()
            
            elif redistributable_count == 0:
                # No hay cuotas redistributables - todas están fijas
                # En este caso, el total podría no coincidir con el objetivo
                # pero no podemos hacer nada sin afectar cuotas ya pagadas
                pass
                
        except Exception as e:
            # Log del error para debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error en redistribución de cuotas para venta {self.venta.id}: {str(e)}")
            # No relanzar la excepción para evitar que falle la modificación principal
            pass

    @staticmethod
    def _calculate_due_date(start_date, installment_number, payment_day):
        """
        Calcula la fecha de vencimiento para una cuota específica.
        """
        # Calcular el mes de vencimiento
        target_month = start_date.month + installment_number - 1
        target_year = start_date.year + (target_month - 1) // 12
        target_month = ((target_month - 1) % 12) + 1
        
        # Crear la fecha de vencimiento
        try:
            due_date = date(target_year, target_month, payment_day)
        except ValueError:
            # Si el día no existe en el mes, usar el último día del mes
            if target_month == 12:
                next_month = date(target_year + 1, 1, 1)
            else:
                next_month = date(target_year, target_month + 1, 1)
            due_date = next_month - timedelta(days=1)
        
        return due_date

    def add_payment(self, payment):
        """
        Asocia un pago a esta cuota del cronograma.
        """
        self.payments.add(payment)
        self.sync_payment_info()
        self.save()  # Esto actualizará automáticamente el estado y monto pagado
    
    def sync_payment_info(self):
        """
        Sincroniza la información de pago desde los pagos asociados.
        """
        if self.payments.exists():
            # Obtener el último pago realizado
            latest_payment = self.payments.order_by('-payment_date').first()
            if latest_payment and latest_payment.payment_date:
                self.payment_date = latest_payment.payment_date
                self.payment_method = latest_payment.method
                self.receipt_number = latest_payment.receipt_number
                self.receipt_date = latest_payment.receipt_date
                self.receipt_image = latest_payment.receipt_image
                # Mantener boleta_image independiente - no se sincroniza desde Payment
                if latest_payment.notes and not self.notes:
                    self.notes = latest_payment.notes

    def reset_payment(self, payment_to_remove, recorded_by=None):
        """
        Restablece una cuota eliminando un pago específico y volviendo al estado pendiente.
        Elimina toda la información relacionada al pago como si nunca se hubiera realizado.
        """
        # Remover el pago de la relación
        self.payments.remove(payment_to_remove)
        
        # Limpiar toda la información de pago
        self.paid_amount = Decimal('0.00')
        self.payment_date = None
        self.payment_method = None
        self.receipt_number = None
        self.receipt_date = None
        self.receipt_image = None
        self.boleta_image = None
        self.is_forgiven = False
        self.recorded_by = recorded_by
        
        # Determinar el nuevo estado basado en la fecha de vencimiento
        today = timezone.now().date()
        if self.due_date < today:
            self.status = 'overdue'
        else:
            self.status = 'pending'
        
        # Agregar nota sobre el restablecimiento
        reset_note = f"Pago restablecido el {timezone.now().strftime('%d/%m/%Y %H:%M')} por {recorded_by.get_full_name() if recorded_by else 'Sistema'}"
        if self.notes:
            self.notes += f"\n{reset_note}"
        else:
            self.notes = reset_note
        
        self.save()
        
        # Actualizar el estado del lote para recalcular el saldo
        if hasattr(self.venta, 'lote') and self.venta.lote:
            self.venta.lote.save()
        
        return self

    def get_payment_history(self):
        """
        Retorna el historial de pagos para esta cuota.
        """
        return self.payments.all().order_by('payment_date')
    
    @classmethod
    def get_total_forgiven_amount(cls, lote):
        """
        Retorna el monto total de cuotas absueltas para un lote.
        """
        return cls.objects.filter(
            lote=lote,
            is_forgiven=True
        ).aggregate(
            total=models.Sum('scheduled_amount')
        )['total'] or Decimal('0.00')