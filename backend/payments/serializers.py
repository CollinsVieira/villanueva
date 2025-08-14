from rest_framework import serializers
from .models import Payment
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
            'method',
            'receipt_number',
            'installment_number',
            'receipt_image',
            'notes',
            'recorded_by',
            'created_at',
            'updated_at'
        ]
        # 'installment_number' ha sido eliminado de esta lista
        read_only_fields = ['id', 'created_at', 'updated_at', 'recorded_by', 'lote']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['recorded_by'] = request.user
        
        lote_id = validated_data.pop('lote_id', None)
        if lote_id:
            validated_data['lote_id'] = lote_id

        return super().create(validated_data)