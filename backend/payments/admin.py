from django.contrib import admin
from .models import Payment, PaymentPlan

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['lote', 'amount', 'payment_date', 'due_date', 'installment_number', 'payment_type', 'method', 'is_overdue']
    list_filter = ['payment_type', 'method', 'payment_date', 'due_date', 'lote__status']
    search_fields = ['lote__block', 'lote__lot_number', 'lote__owner__full_name', 'receipt_number']
    readonly_fields = ['is_overdue', 'days_overdue', 'created_at', 'updated_at']
    ordering = ['-payment_date', 'due_date']

@admin.register(PaymentPlan)
class PaymentPlanAdmin(admin.ModelAdmin):
    list_display = ['lote', 'start_date', 'payment_day', 'get_total_payments', 'get_paid_payments']
    list_filter = ['start_date', 'payment_day']
    search_fields = ['lote__block', 'lote__lot_number', 'lote__owner__full_name']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_total_payments(self, obj):
        return obj.get_payment_status()['total']
    get_total_payments.short_description = 'Total Cuotas'
    
    def get_paid_payments(self, obj):
        status = obj.get_payment_status()
        return f"{status['paid']}/{status['total']}"
    get_paid_payments.short_description = 'Pagadas'
