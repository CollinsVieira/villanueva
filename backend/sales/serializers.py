from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import Venta
from lotes.serializers import LoteSerializer
from customers.serializers import CustomerSerializer


class VentaSerializer(serializers.ModelSerializer):
    """Serializer completo para el modelo Venta"""
    
    lote_info = LoteSerializer(source='lote', read_only=True)
    customer_info = CustomerSerializer(source='customer', read_only=True)
    remaining_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_day = serializers.SerializerMethodField()
    financing_months = serializers.SerializerMethodField()
    total_initial_payments = serializers.SerializerMethodField()
    initial_payment_balance = serializers.SerializerMethodField()
    is_initial_payment_complete = serializers.SerializerMethodField()
    
    class Meta:
        model = Venta
        fields = [
            'id', 'lote', 'customer', 'status', 'sale_price', 'initial_payment',
            'sale_date', 'contract_date', 'schedule_start_date', 'contract_pdf', 'cancellation_date', 'completion_date',
            'notes', 'cancellation_reason', 'created_at', 'updated_at',
            # Campos calculados
            'remaining_balance', 'status_display', 'payment_day', 'financing_months',
            'total_initial_payments', 'initial_payment_balance', 'is_initial_payment_complete',
            # Información relacionada
            'lote_info', 'customer_info'
        ]
        read_only_fields = ['sale_date', 'created_at', 'updated_at', 'cancellation_date', 'completion_date']

    def get_payment_day(self, obj):
        """Obtiene el día de pago del plan de pagos asociado"""
        try:
            if hasattr(obj, 'plan_pagos'):
                return obj.plan_pagos.payment_day
            return obj.payment_day  # Usar el valor del modelo
        except:
            return obj.payment_day  # Usar el valor del modelo
    
    def get_financing_months(self, obj):
        """Obtiene los meses de financiamiento de la venta"""
        return obj.financing_months
    
    def get_total_initial_payments(self, obj):
        """Obtiene el total de pagos iniciales realizados"""
        return float(obj.get_total_initial_payments())
    
    def get_initial_payment_balance(self, obj):
        """Obtiene el saldo pendiente del pago inicial"""
        return float(obj.get_initial_payment_balance())
    
    def get_is_initial_payment_complete(self, obj):
        """Verifica si el pago inicial está completo"""
        return obj.is_initial_payment_complete()


class VentaCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear nuevas ventas"""
    
    payment_day = serializers.IntegerField(
        min_value=1,
        max_value=31,
        required=True,
        help_text=_("Día del mes en que vencen las cuotas (1-31)")
    )
    
    financing_months = serializers.IntegerField(
        min_value=1,
        max_value=120,
        required=True,
        help_text=_("Número de meses para el financiamiento")
    )
    
    contract_pdf = serializers.FileField(
        required=False,
        allow_null=True,
        help_text=_("Archivo PDF del contrato (opcional)")
    )
    
    schedule_start_date = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text=_("Fecha de inicio del cronograma en formato YYYY-MM (opcional)")
    )
    
    class Meta:
        model = Venta
        fields = [
            'lote', 'customer', 'sale_price', 'initial_payment', 
            'contract_date', 'schedule_start_date', 'contract_pdf', 'notes', 'payment_day', 'financing_months'
        ]
    
    def validate_lote(self, value):
        """Validar que el lote esté disponible para venta"""
        if value.status != 'disponible':
            raise serializers.ValidationError(_("El lote no está disponible para venta"))
        
        # Verificar que no haya una venta activa
        active_sale = Venta.get_active_sale_for_lote(value)
        if active_sale:
            raise serializers.ValidationError(_("Ya existe una venta activa para este lote"))
        
        return value
    
    def validate_contract_pdf(self, value):
        """Validar que el archivo sea un PDF"""
        if value:
            if not value.name.lower().endswith('.pdf'):
                raise serializers.ValidationError(_("El archivo debe ser un PDF"))
            
            # Validar tamaño del archivo (máximo 10MB)
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError(_("El archivo PDF no puede ser mayor a 10MB"))
        
        return value
    
    def validate(self, attrs):
        """Validaciones adicionales"""
        sale_price = attrs.get('sale_price')
        initial_payment = attrs.get('initial_payment', 0)
        
        if initial_payment > sale_price:
            raise serializers.ValidationError({
                'initial_payment': _("El pago inicial no puede ser mayor al precio de venta")
            })
        
        return attrs
    
    def create(self, validated_data):
        """Crear una nueva venta con plan de pagos automático"""
        payment_day = validated_data.pop('payment_day')
        financing_months = validated_data.pop('financing_months')
        
        # Convertir schedule_start_date de YYYY-MM a Date si está presente
        if 'schedule_start_date' in validated_data and validated_data['schedule_start_date']:
            try:
                from datetime import datetime
                date_str = validated_data['schedule_start_date']
                # Convertir YYYY-MM a YYYY-MM-01 (primer día del mes)
                date_obj = datetime.strptime(date_str, '%Y-%m').date().replace(day=1)
                validated_data['schedule_start_date'] = date_obj
            except ValueError:
                # Si el formato es incorrecto, eliminar el campo
                del validated_data['schedule_start_date']
        
        return Venta.create_sale(payment_day=payment_day, financing_months=financing_months, **validated_data)


class VentaUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar ventas existentes"""
    
    payment_day = serializers.IntegerField(
        min_value=1,
        max_value=31,
        required=False,
        help_text=_("Día del mes en que vencen las cuotas (1-31)")
    )
    
    financing_months = serializers.IntegerField(
        min_value=1,
        max_value=120,
        required=False,
        help_text=_("Número de meses para el financiamiento")
    )
    
    contract_pdf = serializers.FileField(
        required=False,
        allow_null=True,
        help_text=_("Archivo PDF del contrato (opcional)")
    )
    
    schedule_start_date = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text=_("Fecha de inicio del cronograma en formato YYYY-MM (opcional)")
    )
    
    class Meta:
        model = Venta
        fields = [
            'sale_price', 'initial_payment', 'contract_date', 'schedule_start_date', 
            'contract_pdf', 'notes', 'payment_day', 'financing_months'
        ]
    
    def validate_contract_pdf(self, value):
        """Validar archivo PDF"""
        if value:
            if not value.name.lower().endswith('.pdf'):
                raise serializers.ValidationError(_("El archivo debe ser un PDF"))
            
            # Validar tamaño del archivo (máximo 10MB)
            if value.size > 10 * 1024 * 1024:
                raise serializers.ValidationError(_("El archivo PDF no puede ser mayor a 10MB"))
        
        return value
    
    def validate(self, attrs):
        """Validaciones adicionales"""
        sale_price = attrs.get('sale_price')
        initial_payment = attrs.get('initial_payment')
        
        if sale_price and initial_payment and initial_payment > sale_price:
            raise serializers.ValidationError({
                'initial_payment': _("El pago inicial no puede ser mayor al precio de venta")
            })
        
        return attrs
    
    def update(self, instance, validated_data):
        """Actualizar una venta existente"""
        # Convertir schedule_start_date de YYYY-MM a Date si está presente
        if 'schedule_start_date' in validated_data and validated_data['schedule_start_date']:
            try:
                from datetime import datetime
                date_str = validated_data['schedule_start_date']
                # Convertir YYYY-MM a YYYY-MM-01 (primer día del mes)
                date_obj = datetime.strptime(date_str, '%Y-%m').date().replace(day=1)
                validated_data['schedule_start_date'] = date_obj
            except ValueError:
                # Si el formato es incorrecto, eliminar el campo
                del validated_data['schedule_start_date']
        
        # Guardar valores originales para comparar cambios
        original_payment_day = instance.payment_day
        original_financing_months = instance.financing_months
        
        # Actualizar campos normales
        for attr, value in validated_data.items():
            if attr not in ['payment_day', 'financing_months']:
                setattr(instance, attr, value)
        
        # Manejar payment_day y financing_months
        payment_day = validated_data.get('payment_day')
        financing_months = validated_data.get('financing_months')
        
        if payment_day is not None:
            instance.payment_day = payment_day
        if financing_months is not None:
            instance.financing_months = financing_months
        
        instance.save()
        
        # Verificar si cambió el payment_day o financing_months
        payment_day_changed = payment_day is not None and payment_day != original_payment_day
        financing_months_changed = financing_months is not None and financing_months != original_financing_months
        
        # Si cambió el payment_day o financing_months, actualizar el cronograma
        if payment_day_changed or financing_months_changed:
            try:
                if financing_months_changed:
                    # Usar el nuevo método para manejar cambios en financing_months
                    instance.update_payment_schedule_for_financing_change(
                        new_financing_months=instance.financing_months,
                        new_payment_day=instance.payment_day
                    )
                elif payment_day_changed:
                    # Solo cambió el payment_day, usar el método original
                    instance.regenerate_payment_schedule()
                        
            except Exception as e:
                # Log del error para debugging
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error updating payment schedule for venta {instance.id}: {str(e)}")
                # No relanzar la excepción para evitar que falle la actualización
        
        return instance


class VentaSummarySerializer(serializers.ModelSerializer):
    """Serializer resumido para listados de ventas"""
    
    lote_display = serializers.SerializerMethodField()
    customer_display = serializers.SerializerMethodField()
    customer_info = CustomerSerializer(source='customer', read_only=True)
    remaining_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_day = serializers.SerializerMethodField()
    financing_months = serializers.SerializerMethodField()
    
    class Meta:
        model = Venta
        fields = [
            'id', 'lote_display', 'customer_display', 'customer_info', 'sale_price', 
            'initial_payment', 'remaining_balance', 'status', 'status_display',
            'sale_date', 'contract_date', 'contract_pdf', 'payment_day', 'financing_months',
            'cancellation_reason', 'notes'
        ]
    
    def get_lote_display(self, obj):
        return f"Mz. {obj.lote.block}, Lote {obj.lote.lot_number}"
    
    def get_customer_display(self, obj):
        return f"{obj.customer.first_name} {obj.customer.last_name}"

    def get_payment_day(self, obj):
        """Obtiene el día de pago del plan de pagos asociado"""
        try:
            if hasattr(obj, 'plan_pagos'):
                return obj.plan_pagos.payment_day
            return obj.payment_day  # Usar el valor del modelo
        except:
            return obj.payment_day  # Usar el valor del modelo
    
    def get_financing_months(self, obj):
        """Obtiene los meses de financiamiento de la venta"""
        return obj.financing_months


class VentaCancelSerializer(serializers.Serializer):
    """Serializer para cancelar una venta"""
    
    reason = serializers.CharField(
        max_length=500,
        required=True,
        help_text=_("Motivo de la cancelación")
    )


class VentaCompleteSerializer(serializers.Serializer):
    """Serializer para completar una venta"""
    
    notes = serializers.CharField(
        max_length=500,
        required=False,
        help_text=_("Notas adicionales sobre la finalización")
    )


class InitialPaymentSerializer(serializers.Serializer):
    """Serializer para registrar el pago inicial"""
    
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=0.01
    )
    payment_method = serializers.ChoiceField(
        choices=[
            ('efectivo', _('Efectivo')),
            ('transferencia', _('Transferencia Bancaria')),
            ('tarjeta', _('Tarjeta de Crédito/Débito')),
            ('otro', _('Otro')),
        ],
        default='transferencia'
    )
    receipt_number = serializers.CharField(max_length=100, required=False)
    receipt_date = serializers.DateField(required=False)
    payment_date = serializers.DateTimeField(required=False)
    receipt_image = serializers.ImageField(required=False)
    notes = serializers.CharField(max_length=500, required=False)
