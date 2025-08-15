# villanueva/backend/customers/serializers.py

from rest_framework import serializers
from django.utils.translation import gettext_lazy as _ # <--- ¡ESTA LÍNEA FALTABA!
from .models import Customer
from users.serializers import UserSerializer

class CustomerSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Customer.
    """
    # Usamos un serializador anidado para mostrar detalles del usuario
    created_by = UserSerializer(read_only=True)
    
    # Campo de solo lectura para el nombre completo
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 
            'first_name', 
            'last_name', 
            'full_name',
            'email', 
            'phone', 
            'address',
            'document_type',
            'document_number',
            'created_at', 
            'updated_at',
            'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def create(self, validated_data):
        # Asignar el usuario actual como creador del cliente
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)
        
    def validate_email(self, value):
        """
        Verifica que el email sea único si se proporciona.
        """
        if value and Customer.objects.filter(email=value).exists():
            raise serializers.ValidationError(_("Este correo electrónico ya está en uso por otro cliente.")) #
        return value

    def validate_document_number(self, value):
        """
        Verifica que el número de documento sea único si se proporciona.
        """
        if value and Customer.objects.filter(document_number=value).exists():
            raise serializers.ValidationError(_("Este número de documento ya está registrado.")) #