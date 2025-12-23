from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.db.models import Sum


class PaymentsPagination(PageNumberPagination):
    page_size_query_param = 'page_size'
    max_page_size = 5000

    def get_paginated_response(self, data):
        # Calculamos el total recaudado del queryset completo (sin paginar)
        queryset = self.page.paginator.object_list
        total_recaudado = queryset.aggregate(total=Sum('amount'))['total'] or 0
        return Response({
            'info': {
                'page': self.page.number,
                'count': self.page.paginator.count,
                'pages': self.page.paginator.num_pages,
                'next': self.get_next_link(),
                'prev': self.get_previous_link(),
                'total_recaudado': float(total_recaudado)
            },
            'results': data
        })