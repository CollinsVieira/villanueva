from rest_framework import serializers
from .models import Lote, LoteHistory
from users.serializers import UserSerializer
from customers.models import Customer # <-- Importamos el MODELO, no el serializador

# --- 1. PRIMERO, definimos el serializador anidado ---
class NestedCustomerSerializer(serializers.ModelSerializer):
    """
    Un serializador simple para mostrar información básica del propietario
    dentro de la vista de un lote.
    """
    class Meta:
        model = Customer
        fields = ['id', 'full_name', 'document_number', 'phone', 'email']

# --- 2. AHORA, definimos el resto de los serializadores ---
class LoteHistorySerializer(serializers.ModelSerializer):
    """Serializador para el historial de un lote."""
    user = UserSerializer(read_only=True)

    class Meta:
        model = LoteHistory
        fields = ['id', 'user', 'action', 'details', 'timestamp']


class LoteSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Lote.
    """
    # Ahora 'NestedCustomerSerializer' ya está definido y se puede usar
    owner = NestedCustomerSerializer(read_only=True)
    owner_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    history = LoteHistorySerializer(many=True, read_only=True) 
    remaining_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Lote
        fields = [
            'id', 
            'block', 
            'lot_number', 
            'area', 
            'price',
            'initial_payment',
            'financing_months',
            'payment_day',
            'remaining_balance', 
            'status',
            'installments_paid',
            'monthly_installment',
            'has_initial_payment',
            'initial_payment_amount',
            'owner',
            'owner_id',
            'history',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 
                            'created_at', 
                            'updated_at', 
                            'owner', 
                            'history', 
                            'remaining_balance', 
                            'installments_paid', 
                            'monthly_installment' ]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        
        owner_id = validated_data.pop('owner_id', None)
        if owner_id:
            validated_data['owner_id'] = owner_id

        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Extraemos owner_id de los datos validados.
        # validated_data.pop() nos permite manejarlo por separado.
        owner_id = validated_data.pop('owner_id', None)
        
        # Asignamos el nuevo propietario. Si owner_id es null, se desasigna.
        instance.owner_id = owner_id
        return super().update(instance, validated_data)