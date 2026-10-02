from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Lote, LoteHistory


class LoteHistoryInline(admin.TabularInline):
    model = LoteHistory
    extra = 0
    readonly_fields = ['timestamp', 'user', 'action', 'details']
    can_delete = False


@admin.register(Lote)
class LoteAdmin(admin.ModelAdmin):
    list_display = [
        'display_name', 'block', 'lot_number', 'area', 'price', 
        'status', 'is_deleted', 'deleted_at', 'deleted_by', 'created_at'
    ]
    list_filter = ['is_deleted', 'status', 'block', 'created_at', 'deleted_at']
    search_fields = ['block', 'lot_number', 'deletion_reason']
    readonly_fields = ['created_at', 'updated_at', 'deleted_at', 'deleted_by']
    inlines = [LoteHistoryInline]
    actions = ['soft_delete_selected', 'restore_selected']

    def get_queryset(self, request):
        # Permitir al admin de Django ver todos los lotes (activos y eliminados)
        return Lote.all_objects.all()

    @admin.action(description=_("Retirar/Eliminar lógicamente los lotes seleccionados"))
    def soft_delete_selected(self, request, queryset):
        count = 0
        for lote in queryset.filter(is_deleted=False):
            lote.soft_delete(user=request.user, reason="Eliminado desde panel de administración")
            count += 1
        self.message_user(request, f"{count} lote(s) retirado(s) exitosamente del inventario activo.")

    @admin.action(description=_("Restaurar los lotes seleccionados al inventario activo"))
    def restore_selected(self, request, queryset):
        count = 0
        errors = []
        for lote in queryset.filter(is_deleted=True):
            try:
                lote.restore(user=request.user)
                count += 1
            except Exception as e:
                errors.append(f"Mz {lote.block} Lt {lote.lot_number}: {str(e)}")
        
        msg = f"{count} lote(s) restaurado(s) exitosamente."
        if errors:
            msg += f" Errores: {'; '.join(errors)}"
        self.message_user(request, msg)


@admin.register(LoteHistory)
class LoteHistoryAdmin(admin.ModelAdmin):
    list_display = ['lote', 'user', 'action', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['lote__block', 'lote__lot_number', 'action', 'details']
    readonly_fields = ['timestamp', 'lote', 'user', 'action', 'details']
