from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import Customer
from users.serializers import UserSerializer
from payments.serializers import PaymentSerializer
from django.db import transaction

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


class BulkCustomerCreateSerializer(serializers.Serializer):
    """
    Serializer para crear múltiples clientes en una sola petición.
    """
    customers = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=1000,  # Límite para evitar sobrecarga
        help_text="Lista de clientes a crear (máximo 1000)"
    )
    
    def validate_customers(self, value):
        """
        Valida cada cliente individualmente y verifica duplicados en el lote.
        """
        if not value:
            raise serializers.ValidationError(_("La lista de clientes no puede estar vacía."))
        
        # Validar estructura básica de cada cliente
        required_fields = ['first_name', 'last_name']
        for i, customer_data in enumerate(value):
            for field in required_fields:
                if field not in customer_data or not customer_data[field]:
                    raise serializers.ValidationError(
                        _("El cliente en la posición {position} debe tener {field}.").format(
                            position=i+1, field=field
                        )
                    )
        
        # Verificar duplicados dentro del lote
        emails = []
        document_numbers = []
        
        for i, customer_data in enumerate(value):
            # Verificar email duplicado en el lote
            if 'email' in customer_data and customer_data['email']:
                if customer_data['email'] in emails:
                    raise serializers.ValidationError(
                        _("El email '{email}' está duplicado en el lote de clientes.").format(
                            email=customer_data['email']
                        )
                    )
                emails.append(customer_data['email'])
            
            # Verificar número de documento duplicado en el lote
            if 'document_number' in customer_data and customer_data['document_number']:
                if customer_data['document_number'] in document_numbers:
                    raise serializers.ValidationError(
                        _("El número de documento '{doc}' está duplicado en el lote de clientes.").format(
                            doc=customer_data['document_number']
                        )
                    )
                document_numbers.append(customer_data['document_number'])
        
        # Verificar duplicados con la base de datos
        if emails:
            existing_emails = Customer.objects.filter(email__in=emails).values_list('email', flat=True)
            if existing_emails:
                raise serializers.ValidationError(
                    _("Los siguientes emails ya existen en la base de datos: {emails}").format(
                        emails=', '.join(existing_emails)
                    )
                )
        
        if document_numbers:
            existing_docs = Customer.objects.filter(document_number__in=document_numbers).values_list('document_number', flat=True)
            if existing_docs:
                raise serializers.ValidationError(
                    _("Los siguientes números de documento ya existen en la base de datos: {docs}").format(
                        docs=', '.join(existing_docs)
                    )
                )
        
        return value
    
    def create(self, validated_data):
        """
        Crea múltiples clientes en una transacción.
        """
        customers_data = validated_data['customers']
        request = self.context.get('request')
        created_by = request.user if request and hasattr(request, 'user') else None
        
        created_customers = []
        
        with transaction.atomic():
            for customer_data in customers_data:
                # Agregar el usuario que crea el cliente
                if created_by:
                    customer_data['created_by'] = created_by
                
                # Crear el cliente usando el serializer individual
                serializer = CustomerSerializer(data=customer_data, context=self.context)
                if serializer.is_valid(raise_exception=True):
                    customer = serializer.save()
                    created_customers.append(customer)
        
        return {
            'message': _("Se crearon {count} clientes exitosamente.").format(count=len(created_customers)),
            'created_count': len(created_customers),
            'customers': CustomerSerializer(created_customers, many=True, context=self.context).data
        }