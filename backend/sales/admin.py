from django.contrib import admin
from django.utils.html import format_html
from .models import Venta


@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'lote_info', 'customer', 'sale_price', 'initial_payment', 
        'remaining_balance', 'status_badge', 'sale_date'
    ]
    list_filter = ['status', 'sale_date', 'lote__block']
    search_fields = [
        'customer__first_name', 'customer__last_name', 'customer__email',
        'lote__block', 'lote__lot_number'
    ]
    readonly_fields = ['sale_date', 'created_at', 'updated_at', 'remaining_balance']
    
    fieldsets = (
        ('Información de la Venta', {
            'fields': ('lote', 'customer', 'status', 'sale_price', 'initial_payment')
        }),
        ('Fechas', {
            'fields': ('sale_date', 'contract_date', 'cancellation_date', 'completion_date')
        }),
        ('Información Adicional', {
            'fields': ('notes', 'cancellation_reason'),
            'classes': ('collapse',)
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def lote_info(self, obj):
        return f"Mz. {obj.lote.block}, Lote {obj.lote.lot_number}"
    lote_info.short_description = "Lote"
    
    def status_badge(self, obj):
        colors = {
            'active': '#28a745',
            'cancelled': '#dc3545', 
            'completed': '#007bff',
            'suspended': '#ffc107'
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = "Estado"
    
    def remaining_balance(self, obj):
        return f"${obj.remaining_balance:,.2f}"
    remaining_balance.short_description = "Saldo Restante"
    
    actions = ['cancel_sales', 'complete_sales']
    
    def cancel_sales(self, request, queryset):
        count = 0
        for venta in queryset.filter(status='active'):
            venta.cancel_sale(reason="Cancelado desde admin")
            count += 1
        
        self.message_user(
            request,
            f"Se cancelaron {count} ventas exitosamente."
        )
    cancel_sales.short_description = "Cancelar ventas seleccionadas"
    
    def complete_sales(self, request, queryset):
        count = 0
        for venta in queryset.filter(status='active'):
            try:
                venta.complete_sale()
                count += 1
            except Exception as e:
                self.message_user(
                    request,
                    f"Error al completar venta {venta.id}: {str(e)}",
                    level='ERROR'
                )
        
        if count > 0:
            self.message_user(
                request,
                f"Se completaron {count} ventas exitosamente."
            )
    complete_sales.short_description = "Completar ventas seleccionadas"
