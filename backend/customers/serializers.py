from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import Customer
from users.serializers import UserSerializer
from lotes.models import Lote
from payments.serializers import PaymentSerializer

class NestedLoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lote
        fields = ['id', 'block', 'lot_number', 'status']

        
class CustomerSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)
    lotes = NestedLoteSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    total_payments = serializers.SerializerMethodField()
    total_pending_balance = serializers.SerializerMethodField()




    class Meta:
        model = Customer
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'email', 'phone', 
            'address', 'document_type', 'document_number', 'created_at', 
            'updated_at', 'created_by', 'lotes', 'payments', 'total_payments', 'total_pending_balance'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'total_payments', 'total_pending_balance']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)
        
    def get_total_payments(self, obj):
        """Retorna el total de pagos realizados por el cliente."""
        return obj.total_payments
        
    def get_total_pending_balance(self, obj):
        """Retorna el saldo total pendiente de todos los lotes del cliente."""
        return obj.total_pending_balance
        
    def validate_email(self, value):
        """
        Verifica que el email sea único, excluyendo el objeto actual al editar.
        """
        # self.instance es el objeto que se está actualizando (None al crear)
        query = Customer.objects.filter(email=value)
        if self.instance:
            query = query.exclude(pk=self.instance.pk)
        
        if value and query.exists():
            raise serializers.ValidationError(_("Este correo electrónico ya está en uso por otro cliente."))
        return value

    def validate_document_number(self, value):
        """
        Verifica que el número de documento sea único, excluyendo el objeto actual al editar.
        """
        query = Customer.objects.filter(document_number=value)
        if self.instance:
            query = query.exclude(pk=self.instance.pk)

        if value and query.exists():
            raise serializers.ValidationError(_("Este número de documento ya está registrado."))
        return value