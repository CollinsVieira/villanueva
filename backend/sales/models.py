from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from decimal import Decimal


class Venta(models.Model):
    """
    Modelo central que representa un contrato de venta entre un cliente y un lote.
    Este modelo actúa como el núcleo de cada transacción y permite múltiples ventas
    del mismo lote a lo largo del tiempo sin perder el historial.
    """
    
    STATUS_CHOICES = [
        ('active', _('Activa')),
        ('cancelled', _('Cancelada')),
        ('completed', _('Completada')),
        ('suspended', _('Suspendida')),
    ]
    
    # Relaciones principales
    lote = models.ForeignKey(
        'lotes.Lote',
        on_delete=models.PROTECT,
        related_name='ventas',
        verbose_name=_("Lote"),
        help_text=_("Lote que se está vendiendo")
    )
    
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.PROTECT,
        related_name='ventas',
        verbose_name=_("Cliente"),
        help_text=_("Cliente que compra el lote")
    )
    
    # Información del contrato
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name=_("Estado"),
        help_text=_("Estado actual del contrato de venta")
    )
    
    sale_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Precio de Venta"),
        help_text=_("Precio total acordado para la venta del lote")
    )
    
    initial_payment = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=_("Pago Inicial"),
        help_text=_("Monto del pago inicial realizado")
    )
    
    financing_months = models.PositiveIntegerField(
        default=12,
        verbose_name=_("Meses de Financiamiento"),
        help_text=_("Número de meses para el financiamiento del lote")
    )
    
    payment_day = models.PositiveIntegerField(
        default=15,
        verbose_name=_("Día de Pago"),
        help_text=_("Día del mes en que vencen las cuotas (1-31)")
    )
    
    # Fechas importantes
    sale_date = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de Venta"),
        help_text=_("Fecha en que se realizó la venta")
    )
    
    contract_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Fecha del Contrato"),
        help_text=_("Fecha oficial del contrato firmado")
    )
    
    contract_pdf = models.FileField(
        upload_to='contracts/',
        null=True,
        blank=True,
        verbose_name=_("PDF del Contrato"),
        help_text=_("Archivo PDF del contrato firmado")
    )
    
    cancellation_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fecha de Cancelación"),
        help_text=_("Fecha en que se canceló la venta")
    )
    
    completion_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Fecha de Finalización"),
        help_text=_("Fecha en que se completó el pago total")
    )
    
    # Información adicional
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notas"),
        help_text=_("Notas adicionales sobre la venta")
    )
    
    cancellation_reason = models.TextField(
        blank=True,
        verbose_name=_("Motivo de Cancelación"),
        help_text=_("Razón por la cual se canceló la venta")
    )
    
    # Metadatos
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Venta")
        verbose_name_plural = _("Ventas")
        ordering = ['-sale_date']
        constraints = [
            # Solo puede haber una venta activa por lote
            models.UniqueConstraint(
                fields=['lote'],
                condition=models.Q(status='active'),
                name='unique_active_sale_per_lote'
            )
        ]
    
    def __str__(self):
        return f"Venta #{self.id} - {self.lote} a {self.customer} ({self.get_status_display()})"
    
    def clean(self):
        """Validaciones del modelo"""
        super().clean()
        
        # Validar que el precio de venta sea positivo
        if self.sale_price <= 0:
            raise ValidationError(_("El precio de venta debe ser mayor a cero"))
        
        # Validar que el pago inicial no sea mayor al precio de venta
        if self.initial_payment > self.sale_price:
            raise ValidationError(_("El pago inicial no puede ser mayor al precio de venta"))
        
        # Validar que solo haya una venta activa por lote
        if self.status == 'active':
            existing_active = Venta.objects.filter(
                lote=self.lote,
                status='active'
            ).exclude(pk=self.pk)
            
            if existing_active.exists():
                raise ValidationError(_("Ya existe una venta activa para este lote"))
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        
        # Actualizar el estado del lote según el estado de la venta
        if self.status == 'active':
            self.lote.status = 'vendido'
            self.lote.customer = self.customer
        elif self.status in ['cancelled', 'completed']:
            # Si no hay otras ventas activas, el lote queda disponible
            other_active_sales = Venta.objects.filter(
                lote=self.lote,
                status='active'
            ).exclude(pk=self.pk)
            
            if not other_active_sales.exists():
                self.lote.status = 'disponible'
                self.lote.customer = None
        
        self.lote.save()
    
    @property
    def remaining_balance(self):
        """Saldo pendiente de la venta"""
        # Con la nueva arquitectura, el saldo pendiente real se deriva del cronograma:
        # suma de remaining_amount de cada cuota. Esto excluye cuotas perdonadas,
        # ya que su remaining_amount es 0.
        total_remaining = Decimal('0.00')
        for schedule in self.payment_schedules.all():
            total_remaining += schedule.remaining_amount
        return total_remaining if total_remaining > 0 else Decimal('0.00')
    
    @property
    def is_active(self):
        """Verifica si la venta está activa"""
        return self.status == 'active'
    
    @property
    def payment_plan(self):
        """Obtiene el plan de pagos asociado a esta venta"""
        return getattr(self, 'plan_pagos', None)
    
    def cancel_sale(self, reason="", user=None):
        """Cancela la venta y libera el lote"""
        from django.utils import timezone
        
        if self.status != 'active':
            raise ValidationError(_("Solo se pueden cancelar ventas activas"))
        
        self.status = 'cancelled'
        self.cancellation_date = timezone.now()
        self.cancellation_reason = reason
        self.save()
        
        # El método save() ya maneja la actualización del lote
        
        return True
    
    def complete_sale(self, user=None):
        """Marca la venta como completada"""
        from django.utils import timezone
        
        if self.status != 'active':
            raise ValidationError(_("Solo se pueden completar ventas activas"))
        
        # Verificar que todos los pagos estén completos
        if self.payment_plan:
            if not self.payment_plan.is_completed:
                raise ValidationError(_("No se puede completar la venta hasta que todos los pagos estén realizados"))
        
        self.status = 'completed'
        self.completion_date = timezone.now()
        self.save()
        
        return True
    
    @classmethod
    def create_sale(cls, lote, customer, sale_price, payment_day, financing_months, initial_payment=None, contract_date=None, contract_pdf=None, **kwargs):
        """Crea una nueva venta y configura el plan de pagos"""
        
        # Verificar que el lote esté disponible
        if lote.status != 'disponible':
            raise ValidationError(_("El lote no está disponible para venta"))
        
        # Crear la venta
        venta = cls.objects.create(
            lote=lote,
            customer=customer,
            sale_price=sale_price,
            initial_payment=initial_payment or Decimal('0.00'),
            contract_date=contract_date,
            contract_pdf=contract_pdf,
            payment_day=payment_day,
            financing_months=financing_months,
            **kwargs
        )
        
        # Crear el plan de pagos automáticamente
        venta.create_payment_plan()
        
        return venta
    
    def create_payment_plan(self, start_date=None, payment_day=None):
        """Crea el plan de pagos para esta venta"""
        from payments.models import PaymentPlan, PaymentSchedule
        
        # Verificar que no exista ya un plan de pagos
        if hasattr(self, 'plan_pagos'):
            return self.plan_pagos
        
        # Usar el payment_day de la venta, el proporcionado, o un valor por defecto
        if payment_day is None:
            payment_day = self.payment_day  # Usar el payment_day de la venta
        
        # Crear el plan de pagos
        plan = PaymentPlan.objects.create(
            venta=self,
            start_date=start_date or self.sale_date.date(),
            payment_day=payment_day
        )
        
        # Generar el cronograma de pagos
        PaymentSchedule.generate_schedule_for_venta(self)
        
        return plan
    
    def regenerate_payment_schedule(self):
        """Regenera el cronograma de pagos cuando cambia el payment_day"""
        from payments.models import PaymentSchedule
        
        # Solo regenerar si no hay pagos realizados
        existing_schedules = self.payment_schedules.all()
        has_payments = existing_schedules.filter(paid_amount__gt=0).exists()
        
        if has_payments:
            raise ValidationError(_("No se puede regenerar el cronograma porque ya existen pagos realizados"))
        
        # Eliminar cronograma existente
        existing_schedules.delete()
        
        # Generar nuevo cronograma con el payment_day actual
        PaymentSchedule.generate_schedule_for_venta(self)
        
        return self.payment_schedules.all()
    
    def register_initial_payment(self, amount, payment_date=None, payment_method='transferencia', 
                                receipt_number=None, receipt_date=None, receipt_image=None, 
                                notes=None, recorded_by=None):
        """Registra el pago inicial de la venta"""
        from payments.models import Payment
        from django.utils import timezone
        
        if payment_date is None:
            payment_date = timezone.now()
        
        # Crear el pago inicial
        payment = Payment.objects.create(
            venta=self,
            amount=amount,
            payment_date=payment_date,
            method=payment_method,
            payment_type='initial',
            receipt_number=receipt_number,
            receipt_date=receipt_date,
            receipt_image=receipt_image,
            notes=notes,
            recorded_by=recorded_by
        )

        return payment
    
    @classmethod
    def get_active_sale_for_lote(cls, lote):
        """Obtiene la venta activa para un lote específico"""
        try:
            return cls.objects.get(lote=lote, status='active')
        except cls.DoesNotExist:
            return None
