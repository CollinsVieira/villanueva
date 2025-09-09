from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import Customer
from users.serializers import UserSerializer
from payments.serializers import PaymentSerializer

class NestedVentaSerializer(serializers.Serializer):
    """Serializer simplificado para mostrar información básica de ventas"""
    id = serializers.IntegerField(read_only=True)
    status = serializers.CharField(read_only=True)
    sale_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    initial_payment = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    sale_date = serializers.DateTimeField(read_only=True)
    lote_display = serializers.SerializerMethodField()
    remaining_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    def get_lote_display(self, obj):
        if hasattr(obj, 'lote') and obj.lote:
            return f"Mz. {obj.lote.block} - Lt. {obj.lote.lot_number}"
        return "Sin lote"

class CustomerSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Customer con nueva arquitectura basada en ventas.
    """
    created_by = UserSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)
    ventas = NestedVentaSerializer(many=True, read_only=True)
    total_payments = serializers.SerializerMethodField()
    total_pending_balance = serializers.SerializerMethodField()
    total_active_ventas = serializers.SerializerMethodField()
    total_ventas_value = serializers.SerializerMethodField()
    payment_completion_percentage = serializers.SerializerMethodField()
    payment_summary = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'email', 'phone', 
            'address', 'document_type', 'document_number', 'created_at', 
            'updated_at', 'created_by', 'ventas', 'payments',
            'total_payments', 'total_pending_balance', 'total_active_ventas',
            'total_ventas_value', 'payment_completion_percentage', 'payment_summary'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'created_by', 'payments',
            'total_payments', 'total_pending_balance', 'total_active_ventas',
            'total_ventas_value', 'payment_completion_percentage', 'payment_summary'
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)
        
    def get_total_payments(self, obj):
        """Retorna el total de pagos realizados por el cliente."""
        return float(obj.total_payments)
        
    def get_total_pending_balance(self, obj):
        """Retorna el saldo total pendiente de todas las ventas activas del cliente."""
        return float(obj.total_pending_balance)
    
    def get_total_active_ventas(self, obj):
        """Retorna el número total de ventas activas del cliente."""
        return obj.total_active_ventas
    
    def get_total_ventas_value(self, obj):
        """Retorna el valor total de todas las ventas del cliente."""
        return float(obj.total_ventas_value)
    
    def get_payment_completion_percentage(self, obj):
        """Retorna el porcentaje de completitud de pagos del cliente."""
        return round(obj.payment_completion_percentage, 2)

    def get_payment_summary(self, obj):
        """Retorna un resumen detallado de los pagos del cliente."""
        return obj.payment_summary
    
    def get_payments(self, obj):
        """Retorna todos los pagos del cliente a través de sus ventas."""
        from payments.models import Payment
        payments = Payment.objects.filter(venta__customer=obj).select_related(
            'venta', 'venta__lote', 'recorded_by', 'payment_schedule'
        ).order_by('-payment_date')
        return PaymentSerializer(payments, many=True, context=self.context).data
        
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