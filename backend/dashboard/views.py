######################################################
# ACA SE MOIFICA LO QUE ENTREGA LA API DE DASHBOARD
######################################################
from django.shortcuts import render


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Sum, Count, Q
from payments.models import PaymentSchedule, Payment
from sales.models import Venta
from lotes.models import Lote
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from payments.serializers import PaymentSerializer, PaymentScheduleSerializer
from customers.models import Customer


class DueDatesPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class DashboardSummaryView(APIView):
    @method_decorator(cache_page(60 * 20)) # Cache por 2 minutos
    def get(self, request):
        # 1. Agregaciones rápidas (SQL puro mediante ORM)
        total_clientes = Customer.objects.count()
        total_lotes = Lote.objects.count()
        lotes_disponibles = Lote.objects.filter(status='disponible').count()
        lotes_vendidos = Lote.objects.filter(status='vendido').count()
        cuotas_vencidas = PaymentSchedule.objects.filter(
            status='overdue',
            venta__status='active'  # Solo ventas activas
        ).count()
        
        
        # 2. Datos para gráficos (Agrupación)
        # Aquí puedes usar TruncMonth para agrupar por mes
        
        # 3. Listas limitadas (Solo lo último)
        ultimos_pagos = Payment.objects.select_related('venta__customer').order_by('-created_at')[:5]
        ultimos_pagos_serializer = PaymentSerializer(ultimos_pagos, many=True)

        cuotas_proximas_a_vencer = PaymentSchedule.objects.filter(
            status='pending',
            venta__status='active'  # Solo ventas activas
        ).order_by('due_date')[:5]
        cuotas_proximas_a_vencer_serializer = PaymentScheduleSerializer(cuotas_proximas_a_vencer, many=True)
        

        return Response({
            "info": {
                "total_clientes": total_clientes,
                "total_lotes": total_lotes,
                "lotes_disponibles": lotes_disponibles,
                "lotes_vendidos": lotes_vendidos,
                "cuotas_vencidas": cuotas_vencidas,
            },
            "results": {
                "ultimos_pagos": ultimos_pagos_serializer.data,
                "cuotas_proximas_a_vencer": cuotas_proximas_a_vencer_serializer.data
            }
        })


class AllDueDatesView(APIView):
    """
    Vista para obtener todas las cuotas pendientes y vencidas de ventas activas.
    Soporta paginación y filtrado por estado.
    """
    pagination_class = DueDatesPagination
    
    def get(self, request):
        from datetime import date, timedelta
        
        # Obtener parámetro de filtro (pending, overdue, o all)
        status_filter = request.query_params.get('status', 'all')
        # Obtener parámetro de ordenamiento (asc o desc)
        ordering = request.query_params.get('ordering', 'asc')
        
        # Query base: solo ventas activas
        queryset = PaymentSchedule.objects.filter(
            venta__status='active'
        ).select_related('venta', 'venta__lote', 'venta__customer')
        
        # Aplicar filtro de estado
        if status_filter == 'pending':
            queryset = queryset.filter(status='pending')
        elif status_filter == 'overdue':
            queryset = queryset.filter(status='overdue')
        else:
            # 'all' - pendientes y vencidas
            queryset = queryset.filter(status__in=['pending', 'overdue'])
        
        # Ordenar por fecha de vencimiento
        if ordering == 'desc':
            # Próximos a vencer: cuotas que vencen en los próximos 5 días
            today = date.today()
            max_date = today + timedelta(days=5)
            queryset = queryset.filter(
                due_date__gte=today,
                due_date__lte=max_date
            ).order_by('due_date')  # Ordenar por fecha más próxima primero
        else:
            queryset = queryset.order_by('due_date')   # Más antiguas primero
        
        # Paginación
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = PaymentScheduleSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = PaymentScheduleSerializer(queryset, many=True)
        return Response(serializer.data)