from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = [
        'name', 
        'report_type', 
        'status', 
        'requested_by', 
        'created_at', 
        'generated_at',
        'generate_action'
    ]
    list_filter = [
        'report_type', 
        'status', 
        'created_at', 
        'generated_at'
    ]
    search_fields = [
        'name', 
        'description', 
        'requested_by__username',
        'requested_by__first_name',
        'requested_by__last_name'
    ]
    readonly_fields = [
        'created_at', 
        'updated_at', 
        'generated_at', 
        'data_preview'
    ]
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'report_type', 'description')
        }),
        ('Parámetros', {
            'fields': ('start_date', 'end_date')
        }),
        ('Estado', {
            'fields': ('status', 'requested_by')
        }),
        ('Metadatos', {
            'fields': ('created_at', 'updated_at', 'generated_at'),
            'classes': ('collapse',)
        }),
        ('Datos del Reporte', {
            'fields': ('data_preview',),
            'classes': ('collapse',)
        }),
    )
    
    def generate_action(self, obj):
        """Botón para generar reporte."""
        if obj.status in ['pending', 'failed']:
            return format_html(
                '<button onclick="generateReport({})" class="button">Generar</button>',
                obj.pk
            )
        elif obj.status == 'completed':
            return format_html(
                '<span style="color: green;">✓ Completado</span>'
            )
        else:
            return format_html(
                '<span style="color: orange;">⏳ Procesando...</span>'
            )
    generate_action.short_description = 'Acción'
    
    def data_preview(self, obj):
        """Muestra una vista previa de los datos del reporte."""
        if obj.data and obj.status == 'completed':
            # Formatear datos para mejor visualización
            if isinstance(obj.data, dict):
                preview = "<ul>"
                for key, value in list(obj.data.items())[:10]:  # Primeros 10 elementos
                    if isinstance(value, (int, float, str)):
                        preview += f"<li><strong>{key}:</strong> {value}</li>"
                    elif isinstance(value, list):
                        preview += f"<li><strong>{key}:</strong> Lista con {len(value)} elementos</li>"
                    elif isinstance(value, dict):
                        preview += f"<li><strong>{key}:</strong> Objeto con {len(value)} propiedades</li>"
                preview += "</ul>"
                return mark_safe(preview)
            else:
                return str(obj.data)[:500] + "..." if len(str(obj.data)) > 500 else str(obj.data)
        elif obj.status == 'failed' and obj.data:
            return format_html(
                '<span style="color: red;">Error: {}</span>',
                obj.data.get('error', 'Error desconocido')
            )
        return "No hay datos disponibles"
    data_preview.short_description = 'Vista Previa de Datos'
    
    class Media:
        js = ('admin/js/reports.js',)
    
    def save_model(self, request, obj, form, change):
        """Al guardar, asignar el usuario actual si no se ha especificado."""
        if not obj.requested_by:
            obj.requested_by = request.user
        super().save_model(request, obj, form, change)
