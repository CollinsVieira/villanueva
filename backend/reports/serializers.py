from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Report.
    """
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Report
        fields = [
            'id',
            'name',
            'report_type',
            'report_type_display',
            'description',
            'start_date',
            'end_date',
            'status',
            'status_display',
            'data',
            'created_at',
            'updated_at',
            'generated_at',
            'requested_by',
            'requested_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'generated_at', 'data']
    
    def create(self, validated_data):
        # Asignar el usuario actual si no se especifica
        if 'requested_by' not in validated_data:
            validated_data['requested_by'] = self.context['request'].user
        return super().create(validated_data)


class ReportCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear nuevos reportes.
    """
    class Meta:
        model = Report
        fields = [
            'name',
            'report_type',
            'description',
            'start_date',
            'end_date'
        ]
    
    def create(self, validated_data):
        validated_data['requested_by'] = self.context['request'].user
        return super().create(validated_data)


class ReportSummarySerializer(serializers.Serializer):
    """
    Serializer para datos de resumen de reportes.
    """
    total_reports = serializers.IntegerField()
    completed_reports = serializers.IntegerField()
    pending_reports = serializers.IntegerField()
    failed_reports = serializers.IntegerField()
    recent_reports = ReportSerializer(many=True)


class ReportTypeChoicesSerializer(serializers.Serializer):
    """
    Serializer para opciones de tipos de reportes.
    """
    value = serializers.CharField()
    label = serializers.CharField()
