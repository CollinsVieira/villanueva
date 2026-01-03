from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from django.db import transaction
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
        # Eliminar validadores automáticos de UniqueConstraint para usar nuestro mensaje personalizado
        validators = []

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

    def validate(self, data):
        """Validar que no exista un lote con la misma manzana y número."""
        block = data.get('block')
        lot_number = data.get('lot_number')
        
        # Solo validar en creación (cuando no hay instancia)
        if not self.instance and block and lot_number:
            if Lote.objects.filter(block=block, lot_number=lot_number).exists():
                raise serializers.ValidationError({
                    'detail': f"Ya existe un registro con la Manzana '{block}' y Lote '{lot_number}'"
                })
        
        return data

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


class BulkLoteCreateSerializer(serializers.Serializer):
    """
    Serializer para crear múltiples lotes en una sola petición.
    """
    lotes = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=1000,  # Límite para evitar sobrecarga
        help_text="Lista de lotes a crear (máximo 1000)"
    )
    
    def validate_lotes(self, value):
        """
        Valida cada lote individualmente y verifica duplicados en el lote.
        """
        if not value:
            raise serializers.ValidationError(_("La lista de lotes no puede estar vacía."))
        
        # Validar estructura básica de cada lote
        required_fields = ['block', 'lot_number', 'area', 'price']
        for i, lote_data in enumerate(value):
            for field in required_fields:
                if field not in lote_data or lote_data[field] is None or lote_data[field] == '':
                    raise serializers.ValidationError(
                        _("El lote en la posición {position} debe tener {field}.").format(
                            position=i+1, field=field
                        )
                    )
        
        # Verificar duplicados dentro del lote (misma manzana y número)
        lote_identifiers = []
        
        for i, lote_data in enumerate(value):
            block = str(lote_data['block']).strip()
            lot_number = str(lote_data['lot_number']).strip()
            identifier = f"{block}-{lot_number}"
            
            if identifier in lote_identifiers:
                raise serializers.ValidationError(
                    _("El lote Mz. {block} - Lt. {lot_number} está duplicado en el lote de lotes.").format(
                        block=block, lot_number=lot_number
                    )
                )
            lote_identifiers.append(identifier)
        
        # Verificar duplicados con la base de datos
        existing_lotes = Lote.objects.filter(
            block__in=[str(lote['block']).strip() for lote in value],
            lot_number__in=[str(lote['lot_number']).strip() for lote in value]
        ).values_list('block', 'lot_number')
        
        if existing_lotes:
            duplicates = [f"Mz. {block} - Lt. {lot_number}" for block, lot_number in existing_lotes]
            raise serializers.ValidationError(
                _("Los siguientes lotes ya existen en la base de datos: {duplicates}").format(
                    duplicates=', '.join(duplicates)
                )
            )
        
        # Validar valores numéricos
        for i, lote_data in enumerate(value):
            try:
                area = float(lote_data['area'])
                price = float(lote_data['price'])
                
                if area <= 0:
                    raise serializers.ValidationError(
                        _("El lote en la posición {position} debe tener un área mayor a 0.").format(
                            position=i+1
                        )
                    )
                
                if price <= 0:
                    raise serializers.ValidationError(
                        _("El lote en la posición {position} debe tener un precio mayor a 0.").format(
                            position=i+1
                        )
                    )
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    _("El lote en la posición {position} tiene valores de área o precio inválidos.").format(
                        position=i+1
                    )
                )
        
        return value
    
    def create(self, validated_data):
        """
        Crea múltiples lotes en una transacción.
        """
        lotes_data = validated_data['lotes']
        request = self.context.get('request')
        created_by = request.user if request and hasattr(request, 'user') else None
        
        created_lotes = []
        
        with transaction.atomic():
            for lote_data in lotes_data:
                # Agregar el usuario que crea el lote
                if created_by:
                    lote_data['created_by'] = created_by
                
                # Establecer estado por defecto si no se especifica
                if 'status' not in lote_data:
                    lote_data['status'] = 'disponible'
                
                # Crear el lote usando el serializer individual
                serializer = LoteSerializer(data=lote_data, context=self.context)
                if serializer.is_valid(raise_exception=True):
                    lote = serializer.save()
                    created_lotes.append(lote)
        
        return {
            'message': _("Se crearon {count} lotes exitosamente.").format(count=len(created_lotes)),
            'created_count': len(created_lotes),
            'lotes': LoteSerializer(created_lotes, many=True, context=self.context).data
        }