from rest_framework import serializers
from .models import Lote, LoteHistory
from users.serializers import UserSerializer
from customers.serializers import CustomerSerializer

class LoteHistorySerializer(serializers.ModelSerializer):
    """Serializador para el historial de un lote."""
    user = UserSerializer(read_only=True)

    class Meta:
        model = LoteHistory
        fields = ['id', 'user', 'action', 'details', 'timestamp']


class LoteSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Lote con nueva arquitectura simplificada.
    """
    history = LoteHistorySerializer(many=True, read_only=True)
    display_name = serializers.CharField(read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    is_sold = serializers.BooleanField(read_only=True)
    current_owner = serializers.SerializerMethodField()
    payment_day = serializers.SerializerMethodField()

    class Meta:
        model = Lote
        fields = [
            'id', 
            'block', 
            'lot_number', 
            'area', 
            'price',
            'status',
            'display_name',
            'is_available',
            'is_sold',
            'current_owner',
            'history',
            'created_at',
            'updated_at',
            'payment_day'
        ]
        read_only_fields = [
            'id', 
            'created_at', 
            'updated_at', 
            'history',
            'display_name',
            'is_available',
            'is_sold',
            'current_owner',
            'payment_day',
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)

    def validate_price(self, value):
        """Validar que el precio sea positivo."""
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor a 0.")
        return value

    def validate_area(self, value):
        """Validar que el área sea positiva."""
        if value <= 0:
            raise serializers.ValidationError("El área debe ser mayor a 0.")
        return value

    def get_current_owner(self, obj):
        """Obtiene la información del propietario actual del lote."""
        if obj.current_owner:
            return {
                'id': obj.current_owner.id,
                'first_name': obj.current_owner.first_name,
                'last_name': obj.current_owner.last_name,
                'full_name': obj.current_owner.full_name
            }
        return None

    def get_payment_day(self, obj):
        """Obtiene el día de pago del plan de pagos asociado"""
        try:
            if hasattr(obj, 'plan_pagos'):
                return obj.plan_pagos.payment_day
            return 15  # Valor por defecto
        except:
            return 15  # Valor por defecto