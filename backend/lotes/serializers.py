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
    active_sale = serializers.SerializerMethodField()

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
            'active_sale'
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
            'active_sale',
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

    def get_active_sale(self, obj):
        """Obtiene la información de la venta activa del lote"""
        try:
            active_sale = obj.active_sale
            if active_sale:
                return {
                    'id': active_sale.id,
                    'payment_day': active_sale.payment_day,
                    'financing_months': active_sale.financing_months,
                    'sale_price': str(active_sale.sale_price),
                    'initial_payment': str(active_sale.initial_payment) if active_sale.initial_payment else None,
                    'status': active_sale.status
                }
            return None
        except:
            return None