from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Count, Q
from .models import Report
from .serializers import (
    ReportSerializer, 
    ReportCreateSerializer, 
    ReportSummarySerializer,
    ReportTypeChoicesSerializer
)


class ReportListCreateView(generics.ListCreateAPIView):
    """
    Vista para listar y crear reportes.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReportCreateSerializer
        return ReportSerializer
    
    def get_queryset(self):
        queryset = Report.objects.select_related('requested_by')
        
        # Filtros opcionales
        report_type = self.request.query_params.get('type')
        status_filter = self.request.query_params.get('status')
        
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        return queryset.order_by('-created_at')


class ReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para obtener, actualizar y eliminar un reporte específico.
    """
    queryset = Report.objects.select_related('requested_by')
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request, *args, **kwargs):
        """
        Eliminar un reporte específico.
        """
        try:
            report = self.get_object()
            report_name = report.name
            self.perform_destroy(report)
            
            return Response({
                'message': f'Reporte "{report_name}" eliminado exitosamente'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error al eliminar el reporte: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_report(request, pk):
    """
    Genera los datos de un reporte específico.
    """
    try:
        report = Report.objects.get(pk=pk)
        
        if report.status == 'completed':
            return Response({
                'message': 'El reporte ya está completado',
                'data': report.data
            })
        
        # Generar el reporte
        data = report.generate_report_data()
        
        return Response({
            'message': 'Reporte generado exitosamente',
            'data': data,
            'status': report.status
        })
        
    except Report.DoesNotExist:
        return Response(
            {'error': 'Reporte no encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def report_summary(request):
    """
    Obtiene un resumen de todos los reportes.
    """
    reports = Report.objects.all()
    
    summary_data = {
        'total_reports': reports.count(),
        'completed_reports': reports.filter(status='completed').count(),
        'pending_reports': reports.filter(status='pending').count(),
        'failed_reports': reports.filter(status='failed').count(),
        'recent_reports': reports.order_by('-created_at')[:5]
    }
    
    serializer = ReportSummarySerializer(summary_data)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def report_types(request):
    """
    Obtiene los tipos de reportes disponibles.
    """
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in Report.REPORT_TYPE_CHOICES
    ]
    
    serializer = ReportTypeChoicesSerializer(choices, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_report_pdf(request, pk):
    """
    Descarga un reporte en formato PDF.
    """
    try:
        report = Report.objects.get(pk=pk)
        
        if report.status != 'completed':
            return Response(
                {'error': 'El reporte debe estar completado para descargarlo'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Aquí integrarías tu lógica de generación de PDF
        # Por ahora retornamos los datos en JSON como placeholder
        from django.http import JsonResponse
        import json
        
        response = HttpResponse(
            json.dumps(report.data, indent=2, ensure_ascii=False),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="{report.name}.json"'
        
        return response
        
    except Report.DoesNotExist:
        return Response(
            {'error': 'Reporte no encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
