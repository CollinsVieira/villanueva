from rest_framework import serializers
from .models import Payment, PaymentPlan, PaymentSchedule
from django.utils import timezone
from datetime import datetime

class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Payment con nueva arquitectura basada en Venta.
    """
    venta_id = serializers.IntegerField(write_only=True, required=True)
    payment_schedule_id = serializers.IntegerField(write_only=True, required=False)
    payment_date_display = serializers.SerializerMethodField()
    receipt_date_display = serializers.SerializerMethodField()
    venta_info = serializers.SerializerMethodField()
    lote_info = serializers.SerializerMethodField()
    customer_info = serializers.SerializerMethodField()
    payment_schedule_info = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id',
            'venta',
            'venta_id',
            'payment_schedule',
            'payment_schedule_id',
            'amount',
            'payment_date',
            'payment_date_display',
            'method',
            'payment_type',
            'receipt_number',
            'receipt_date',
            'receipt_date_display',
            'receipt_image',
            'notes',
            'recorded_by',
            'created_at',
            'updated_at',
            'venta_info',
            'lote_info',
            'customer_info',
            'payment_schedule_info'
        ]
        read_only_fields = [
            'id', 'venta', 'payment_schedule', 'recorded_by', 'created_at', 'updated_at'
        ]

    def get_payment_date_display(self, obj):
        """Retorna la fecha de pago en formato legible en la zona horaria local del usuario."""
        try:
            if obj.payment_date:
                return timezone.localtime(obj.payment_date).strftime('%d/%m/%Y %H:%M')
            return None
        except Exception as e:
            return None

    def get_receipt_date_display(self, obj):
        """Retorna la fecha de operación en formato legible."""
        try:
            if obj.receipt_date:
                return obj.receipt_date.strftime('%d/%m/%Y')
            return None
        except Exception as e:
            return None

    def get_venta_info(self, obj):
        """Información de la venta asociada"""
        if obj.venta:
            return {
                'id': obj.venta.id,
                'status': obj.venta.status,
                'sale_price': str(obj.venta.sale_price),
                'initial_payment': str(obj.venta.initial_payment) if obj.venta.initial_payment else None,
                'sale_date': obj.venta.sale_date.isoformat() if obj.venta.sale_date else None
            }
        return None

    def get_lote_info(self, obj):
        """Información del lote asociado a través de la venta"""
        if obj.venta and obj.venta.lote:
            return {
                'id': obj.venta.lote.id,
                'block': obj.venta.lote.block,
                'lot_number': obj.venta.lote.lot_number,
                'area': str(obj.venta.lote.area),
                'display': f"Mz. {obj.venta.lote.block}, Lote {obj.venta.lote.lot_number}"
            }
        return None

    def get_customer_info(self, obj):
        """Información del cliente asociado a través de la venta"""
        if obj.venta and obj.venta.customer:
            return {
                'id': obj.venta.customer.id,
                'first_name': obj.venta.customer.first_name,
                'last_name': obj.venta.customer.last_name,
                'full_name': obj.venta.customer.full_name,
                'document_number': obj.venta.customer.document_number,
                'phone': obj.venta.customer.phone
            }
        return None

    def get_payment_schedule_info(self, obj):
        """Información del cronograma de pagos asociado"""
        if obj.payment_schedule:
            return {
                'id': obj.payment_schedule.id,
                'installment_number': obj.payment_schedule.installment_number,
                'scheduled_amount': str(obj.payment_schedule.scheduled_amount),
                'paid_amount': str(obj.payment_schedule.paid_amount),
                'due_date': obj.payment_schedule.due_date.isoformat() if obj.payment_schedule.due_date else None,
                'status': obj.payment_schedule.status,
                'is_forgiven': obj.payment_schedule.is_forgiven
            }
        return None

    def validate(self, attrs):
        """Validar que se proporcione venta_id"""
        venta_id = attrs.get('venta_id')
        if not venta_id:
            raise serializers.ValidationError("venta_id es requerido")
        
        # Verificar que la venta existe
        try:
            from sales.models import Venta
            venta = Venta.objects.get(id=venta_id)
            attrs['venta'] = venta
        except Venta.DoesNotExist:
            raise serializers.ValidationError("La venta especificada no existe")
        
        # Si se proporciona payment_schedule_id, verificar que existe y pertenece a la venta
        payment_schedule_id = attrs.get('payment_schedule_id')
        if payment_schedule_id:
            try:
                schedule = PaymentSchedule.objects.get(id=payment_schedule_id)
                if schedule.venta != venta:
                    raise serializers.ValidationError("El cronograma de pago no pertenece a la venta especificada")
                attrs['payment_schedule'] = schedule
            except PaymentSchedule.DoesNotExist:
                raise serializers.ValidationError("El cronograma de pago especificado no existe")
        
        return attrs

    def create(self, validated_data):
        """Crear un nuevo pago y actualizar el cronograma si es necesario."""
        # Asignar el usuario que registra el pago
        request = self.context.get('request')
        if request and hasattr(request, 'user') and not validated_data.get('recorded_by'):
            validated_data['recorded_by'] = request.user

        # Extraer el cronograma de pago antes de crear el pago
        schedule = validated_data.pop('payment_schedule', None)

        # Crear la instancia de pago
        payment = Payment.objects.create(**validated_data)

        # Si el pago es una cuota y tiene un cronograma asociado, actualizarlo
        if payment.payment_type == 'installment' and schedule:
            # Usar el método del modelo que maneja la lógica de actualización
            schedule.add_payment(payment)
        
        return payment

class PaymentScheduleSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo PaymentSchedule con nueva arquitectura basada en Venta.
    """
    venta_id = serializers.IntegerField(write_only=True, required=True)
    lote_info = serializers.SerializerMethodField()
    customer_info = serializers.SerializerMethodField()
    payments_count = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()
    receipt_number = serializers.SerializerMethodField()
    receipt_image = serializers.SerializerMethodField()

    class Meta:
        model = PaymentSchedule
        fields = [
            'id',
            'venta',
            'venta_id',
            'installment_number',
            'scheduled_amount',
            'due_date',
            'status',
            'paid_amount',
            'payment_date',
            'payment_method',
            'receipt_number',
            'receipt_date',
            'receipt_image',
            'notes',
            'is_forgiven',
            'recorded_by',
            'created_at',
            'updated_at',
            'lote_info',
            'customer_info',
            'payments_count',
            'total_paid',
            'remaining_amount'
        ]
        read_only_fields = [
            'id', 'venta', 'paid_amount', 'payment_date', 'payment_method',
            'receipt_number', 'receipt_date', 'receipt_image', 'recorded_by',
            'created_at', 'updated_at', 'payment_method', 'receipt_number', 'receipt_image'
        ]

    def get_lote_info(self, obj):
        """Información del lote asociado a través de la venta"""
        if obj.venta and obj.venta.lote:
            return {
                'id': obj.venta.lote.id,
                'block': obj.venta.lote.block,
                'lot_number': obj.venta.lote.lot_number,
                'area': str(obj.venta.lote.area),
                'display': f"Mz. {obj.venta.lote.block}, Lote {obj.venta.lote.lot_number}"
            }
        return None

    def get_customer_info(self, obj):
        """Información del cliente asociado a través de la venta"""
        if obj.venta and obj.venta.customer:
            return {
                'id': obj.venta.customer.id,
                'first_name': obj.venta.customer.first_name,
                'last_name': obj.venta.customer.last_name,
                'full_name': obj.venta.customer.full_name,
                'document_number': obj.venta.customer.document_number,
                'phone': obj.venta.customer.phone
            }
        return None

    def get_payments_count(self, obj):
        """Número de pagos registrados para esta cuota"""
        return obj.payments.count()

    def get_total_paid(self, obj):
        """Total pagado para esta cuota"""
        return str(obj.paid_amount or 0)

    def get_remaining_amount(self, obj):
        """Monto restante por pagar"""
        remaining = obj.scheduled_amount - (obj.paid_amount or 0)
        return str(max(remaining, 0))

    def get_payment_method(self, obj):
        """Método de pago del último pago registrado"""
        if obj.payments.exists():
            last_payment = obj.payments.order_by('-created_at').first()
            return last_payment.method
        return None

    def get_receipt_number(self, obj):
        """Número de recibo del último pago registrado"""
        if obj.payments.exists():
            last_payment = obj.payments.order_by('-created_at').first()
            return last_payment.receipt_number
        return None

    def get_receipt_image(self, obj):
        """Imagen de recibo del último pago registrado"""
        if obj.payments.exists():
            last_payment = obj.payments.order_by('-created_at').first()
            return last_payment.receipt_image.url if last_payment.receipt_image else None
        return None

    def validate(self, attrs):
        """Validar que se proporcione venta_id"""
        venta_id = attrs.get('venta_id')
        if not venta_id:
            raise serializers.ValidationError("venta_id es requerido")
        
        # Verificar que la venta existe
        try:
            from sales.models import Venta
            venta = Venta.objects.get(id=venta_id)
            attrs['venta'] = venta
        except Venta.DoesNotExist:
            raise serializers.ValidationError("La venta especificada no existe")
        
        return attrs

    def create(self, validated_data):
        """Crear un nuevo cronograma de pago"""
        # Asignar el usuario que registra el cronograma
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['recorded_by'] = request.user
        
        return super().create(validated_data)

class PaymentScheduleSummarySerializer(serializers.ModelSerializer):
    """
    Serializador resumido para PaymentSchedule (usado en listas)
    """
    lote_display = serializers.SerializerMethodField()
    customer_display = serializers.SerializerMethodField()
    payments_count = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()
    receipt_number = serializers.SerializerMethodField()
    receipt_image = serializers.SerializerMethodField()

    class Meta:
        model = PaymentSchedule
        fields = [
            'id',
            'installment_number',
            'scheduled_amount',
            'due_date',
            'status',
            'paid_amount',
            'payment_date',
            'is_forgiven',
            'lote_display',
            'customer_display',
            'payments_count',
            'total_paid',
            'remaining_amount',
            'payment_method',
            'receipt_number',
            'receipt_image'
        ]

    def get_lote_display(self, obj):
        """Display del lote"""
        if obj.venta and obj.venta.lote:
            return f"Mz. {obj.venta.lote.block}, Lote {obj.venta.lote.lot_number}"
        return None

    def get_customer_display(self, obj):
        """Display del cliente"""
        if obj.venta and obj.venta.customer:
            return obj.venta.customer.full_name
        return None

    def get_payments_count(self, obj):
        """Número de pagos registrados"""
        return obj.payments.count()

    def get_total_paid(self, obj):
        """Total pagado"""
        return str(obj.paid_amount or 0)

    def get_remaining_amount(self, obj):
        """Monto restante"""
        remaining = obj.scheduled_amount - (obj.paid_amount or 0)
        return str(max(remaining, 0))

    def get_payment_method(self, obj):
        """Método de pago del último pago registrado"""
        if obj.payments.exists():
            last_payment = obj.payments.order_by('-created_at').first()
            return last_payment.method
        return None

    def get_receipt_number(self, obj):
        """Número de recibo del último pago registrado"""
        if obj.payments.exists():
            last_payment = obj.payments.order_by('-created_at').first()
            return last_payment.receipt_number
        return None

    def get_receipt_image(self, obj):
        """Imagen de recibo del último pago registrado"""
        if obj.payments.exists():
            last_payment = obj.payments.order_by('-created_at').first()
            return last_payment.receipt_image.url if last_payment.receipt_image else None
        return None

class PaymentPlanSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo PaymentPlan.
    """
    venta_info = serializers.SerializerMethodField()
    lote_info = serializers.SerializerMethodField()
    customer_info = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    schedules_count = serializers.SerializerMethodField()

    class Meta:
        model = PaymentPlan
        fields = [
            'id',
            'venta',
            'start_date',
            'payment_day',
            'created_at',
            'updated_at',
            'venta_info',
            'lote_info',
            'customer_info',
            'payment_status',
            'schedules_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_venta_info(self, obj):
        """Información de la venta asociada"""
        if obj.venta:
            return {
                'id': obj.venta.id,
                'status': obj.venta.status,
                'sale_price': str(obj.venta.sale_price),
                'initial_payment': str(obj.venta.initial_payment) if obj.venta.initial_payment else None,
                'sale_date': obj.venta.sale_date.isoformat() if obj.venta.sale_date else None
            }
        return None

    def get_lote_info(self, obj):
        """Información del lote asociado a través de la venta"""
        if obj.venta and obj.venta.lote:
            return {
                'id': obj.venta.lote.id,
                'block': obj.venta.lote.block,
                'lot_number': obj.venta.lote.lot_number,
                'area': str(obj.venta.lote.area),
                'display': f"Mz. {obj.venta.lote.block}, Lote {obj.venta.lote.lot_number}"
            }
        return None

    def get_customer_info(self, obj):
        """Información del cliente asociado a través de la venta"""
        if obj.venta and obj.venta.customer:
            return {
                'id': obj.venta.customer.id,
                'first_name': obj.venta.customer.first_name,
                'last_name': obj.venta.customer.last_name,
                'full_name': obj.venta.customer.full_name,
                'document_number': obj.venta.customer.document_number,
                'phone': obj.venta.customer.phone
            }
        return None

    def get_payment_status(self, obj):
        """Estado del plan de pagos"""
        return obj.get_payment_status()

    def get_schedules_count(self, obj):
        """Número de cronogramas de pago"""
        return obj.venta.payment_schedules.count()