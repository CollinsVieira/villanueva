from rest_framework import serializers
from .models import Payment, PaymentPlan
from lotes.serializers import LoteSerializer
from django.utils import timezone
from datetime import datetime

class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Payment.
    """
    lote = LoteSerializer(read_only=True)
    lote_id = serializers.IntegerField(write_only=True)
    payment_date_display = serializers.SerializerMethodField()
    receipt_date_display = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id',
            'lote',
            'lote_id',
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
        read_only_fields = ['id', 'created_at', 'updated_at', 'recorded_by', 'lote', 'is_overdue', 'days_overdue', 'payment_date_display', 'receipt_date_display']

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
        if lote_id:
            validated_data['lote_id'] = lote_id

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