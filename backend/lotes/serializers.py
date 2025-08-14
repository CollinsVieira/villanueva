from rest_framework import serializers
from .models import Lote, LoteHistory
from customers.serializers import CustomerSerializer
from users.serializers import UserSerializer

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
    owner = CustomerSerializer(read_only=True)
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
            'initial_payment',      # <-- Añadir
            'financing_months',     # <-- Añadir
            'remaining_balance', 
            'status',
            'owner',
            'owner_id',
            'history',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner', 'history', 'remaining_balance']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        
        owner_id = validated_data.pop('owner_id', None)
        if owner_id:
            validated_data['owner_id'] = owner_id

        return super().create(validated_data)

    def update(self, instance, validated_data):
        owner_id = validated_data.pop('owner_id', None)
        # Se usa `None` como un valor válido para desasignar un propietario
        if owner_id is not None:
            instance.owner_id = owner_id
        
        return super().update(instance, validated_data)