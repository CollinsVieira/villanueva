from rest_framework import serializers
from .models import Lote, LoteHistory
from users.serializers import UserSerializer

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
            'history',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id', 
            'created_at', 
            'updated_at', 
            'history',
            'display_name',
            'is_available',
            'is_sold'
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