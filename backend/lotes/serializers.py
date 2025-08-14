from rest_framework import serializers
from .models import Lote
from customers.serializers import CustomerSerializer

class LoteSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Lote.
    """
    # Usamos un serializador anidado de solo lectura para mostrar los detalles del propietario
    owner = CustomerSerializer(read_only=True)
    
    # Campo para aceptar el ID del propietario al crear o actualizar
    owner_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Lote
        fields = [
            'id', 
            'block', 
            'lot_number', 
            'area', 
            'price', 
            'status',
            'owner',
            'owner_id', # Incluimos el campo de escritura
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']

    def create(self, validated_data):
        # Asignar el usuario actual como creador del lote
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        
        # Asignar el propietario usando el owner_id
        owner_id = validated_data.pop('owner_id', None)
        if owner_id:
            validated_data['owner_id'] = owner_id

        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Asignar el propietario usando el owner_id
        owner_id = validated_data.pop('owner_id', None)
        if owner_id:
            instance.owner_id = owner_id
        
        return super().update(instance, validated_data)