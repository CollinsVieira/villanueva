from rest_framework import serializers
from .models import Payment, PaymentPlan
from lotes.serializers import LoteSerializer
from django.utils import timezone
from datetime import datetime

class NestedCustomerSerializer(serializers.ModelSerializer):
    """Serializador anidado para Customer en Payment"""
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = None  # Se asignará dinámicamente
        fields = ['id', 'first_name', 'last_name', 'full_name', 'email', 'phone', 'document_type', 'document_number']

class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Payment.
    """
    lote = LoteSerializer(read_only=True)
    customer = NestedCustomerSerializer(read_only=True)
    lote_id = serializers.IntegerField(write_only=True)
    customer_id = serializers.IntegerField(write_only=True)
    payment_date_display = serializers.SerializerMethodField()
    receipt_date_display = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Asignar el modelo Customer dinámicamente para evitar importación circular
        from customers.models import Customer
        self.fields['customer'].Meta.model = Customer

    class Meta:
        model = Payment
        fields = [
            'id',
            'lote',
            'lote_id',
            'customer',
            'customer_id',
            'amount',
            'payment_date',
            'payment_date_display',
            'method',
            'payment_type',
            'receipt_number',
            'receipt_date',
            'receipt_date_display',
            'installment_number',
            'receipt_image',
            'notes',
            'payment_plan',
            'recorded_by',
            'created_at',
            'updated_at',
            'is_overdue',
            'days_overdue'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'recorded_by', 'lote', 'customer', 'is_overdue', 'days_overdue', 'payment_date_display', 'receipt_date_display']

    def get_payment_date_display(self, obj):
        """Retorna la fecha de pago en formato legible en la zona horaria local del usuario."""
        try:
            if obj.payment_date:
                # Convertir UTC a zona horaria local del usuario
                return timezone.localtime(obj.payment_date).strftime('%d/%m/%Y %H:%M')
            return None
        except Exception as e:
            # Si hay algún error, retornar None en lugar de fallar
            return None

    def get_receipt_date_display(self, obj):
        """Retorna la fecha de operación en formato legible."""
        try:
            if obj.receipt_date:
                # Formatear la fecha como dd/mm/yyyy
                return obj.receipt_date.strftime('%d/%m/%Y')
            return None
        except Exception as e:
            return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['recorded_by'] = request.user
        
        lote_id = validated_data.pop('lote_id', None)
        customer_id = validated_data.pop('customer_id', None)
        
        if lote_id:
            validated_data['lote_id'] = lote_id
        if customer_id:
            validated_data['customer_id'] = customer_id

        return super().create(validated_data)


class PaymentPlanSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo PaymentPlan.
    """
    payment_status = serializers.SerializerMethodField()
    payments = PaymentSerializer(many=True, read_only=True)
    
    class Meta:
        model = PaymentPlan
        fields = [
            'id',
            'lote',
            'start_date',
            'payment_day',
            'payment_status',
            'payments',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_payment_status(self, obj):
        """Retorna el estado del plan de pagos."""
        return obj.get_payment_status()