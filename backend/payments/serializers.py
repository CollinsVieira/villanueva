from rest_framework import serializers
from .models import Payment, PaymentPlan
from lotes.serializers import LoteSerializer

class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Payment.
    """
    lote = LoteSerializer(read_only=True)
    lote_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'lote',
            'lote_id',
            'amount',
            'payment_date',
            'due_date',
            'method',
            'payment_type',
            'receipt_number',
            'receipt_date',
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
        read_only_fields = ['id', 'created_at', 'updated_at', 'recorded_by', 'lote', 'is_overdue', 'days_overdue']

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