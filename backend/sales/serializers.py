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
    
    class Meta:
        model = Venta
        fields = [
            'id', 'lote', 'customer', 'status', 'sale_price', 'initial_payment',
            'sale_date', 'contract_date', 'cancellation_date', 'completion_date',
            'notes', 'cancellation_reason', 'created_at', 'updated_at',
            # Campos calculados
            'remaining_balance', 'status_display', 'payment_day',
            # Información relacionada
            'lote_info', 'customer_info'
        ]
        read_only_fields = ['sale_date', 'created_at', 'updated_at', 'cancellation_date', 'completion_date']

    def get_payment_day(self, obj):
        """Obtiene el día de pago del plan de pagos asociado"""
        try:
            if hasattr(obj, 'plan_pagos'):
                return obj.plan_pagos.payment_day
            return 15  # Valor por defecto
        except:
            return 15  # Valor por defecto


class VentaCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear nuevas ventas"""
    
    payment_day = serializers.IntegerField(
        min_value=1,
        max_value=31,
        required=True,
        help_text=_("Día del mes en que vencen las cuotas (1-31)")
    )
    
    class Meta:
        model = Venta
        fields = [
            'lote', 'customer', 'sale_price', 'initial_payment', 
            'contract_date', 'notes', 'payment_day'
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
        return Venta.create_sale(payment_day=payment_day, **validated_data)


class VentaSummarySerializer(serializers.ModelSerializer):
    """Serializer resumido para listados de ventas"""
    
    lote_display = serializers.SerializerMethodField()
    customer_display = serializers.SerializerMethodField()
    remaining_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_day = serializers.SerializerMethodField()
    class Meta:
        model = Venta
        fields = [
            'id', 'lote_display', 'customer_display', 'sale_price', 
            'initial_payment', 'remaining_balance', 'status', 'status_display',
            'sale_date', 'contract_date','payment_day'
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
            return 15  # Valor por defecto
        except:
            return 15  # Valor por defecto


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
    receipt_image = serializers.ImageField(required=False)
    notes = serializers.CharField(max_length=500, required=False)
