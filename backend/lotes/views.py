from django.db import transaction
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from users.permissions import IsWorkerOrAdmin
from .models import Lote, LoteHistory
from .serializers import LoteSerializer


class LoteViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite la gestión de lotes.
    - Accesible por 'Trabajadores' y 'Administradores'.
    - Búsqueda por manzana y número de lote.
    - Filtro por estado del lote.
    - Ordenación por precio, área y fecha de creación.
    """
    queryset = Lote.objects.all().select_related('owner', 'created_by')
    serializer_class = LoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkerOrAdmin]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'block']
    search_fields = ['block', 'lot_number', 'owner__first_name', 'owner__last_name']
    ordering_fields = ['price', 'area', 'created_at']
    ordering = ['block', 'lot_number']

    def get_serializer_context(self):
        return {'request': self.request}
    
    def perform_update(self, serializer):
        # Campos que queremos monitorear para el historial
        MONITORED_FIELDS = {
            'owner_id': 'Propietario',
            'status': 'Estado',
            'price': 'Precio',
            'initial_payment': 'Pago Inicial',
            'financing_months': 'Meses de Financiamiento'
        }

    

        # Obtenemos la instancia del lote ANTES de que se guarde el cambio
        old_instance = self.get_object()
        old_values = {field: getattr(old_instance, field) for field in MONITORED_FIELDS}

        # Guardamos la instancia actualizada una sola vez
        new_instance = serializer.save()

        # Comparamos los valores antiguos y nuevos para cada campo monitoreado
        for field, name in MONITORED_FIELDS.items():
            old_value = old_values[field]
            new_value = getattr(new_instance, field)

            if old_value != new_value:
                # Formateamos los valores para que se vean bien en el historial
                if field == 'owner_id':
                    # Para obtener el nombre del propietario anterior, no podemos usar old_instance.owner
                    # porque la relación ya podría haber cambiado.
                    old_display = "Ninguno"
                    if old_value:
                        # Asumimos que el cliente no se ha borrado en la misma transacción
                        try:
                            from customers.models import Customer
                            old_display = Customer.objects.get(pk=old_value).full_name
                        except Customer.DoesNotExist:
                            old_display = f"ID de Cliente Eliminado: {old_value}"
                    
                    new_display = new_instance.owner.full_name if new_instance.owner else "Ninguno"
                else:
                    old_display = old_value
                    new_display = new_value

                LoteHistory.objects.create(
                    lote=new_instance,
                    user=self.request.user,
                    action=f"Cambio de {name}",
                    details=f"El {name} cambió de '{old_display}' a '{new_display}'."
                )

    @action(detail=True, methods=['post'], url_path='transfer-owner')
    @transaction.atomic
    def transfer_owner(self, request, pk=None):
        """
        Transfiere el propietario de este lote a un nuevo lote,
        dejando este lote como 'disponible'.
        Espera en el body: { "new_lote_id": <id_del_nuevo_lote> }
        """
        new_lote_id = request.data.get('new_lote_id')
        if not new_lote_id:
            return Response(
                {"error": "Se requiere el ID del nuevo lote ('new_lote_id')."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            old_lote = self.get_object()
            new_lote = Lote.objects.get(pk=new_lote_id)
        except Lote.DoesNotExist:
            return Response({"error": "Uno de los lotes no existe."}, status=status.HTTP_404_NOT_FOUND)

        if old_lote.owner is None:
            return Response({"error": "El lote actual no tiene propietario para transferir."}, status=status.HTTP_400_BAD_REQUEST)
        if new_lote.owner is not None:
            return Response({"error": "El nuevo lote ya está ocupado."}, status=status.HTTP_400_BAD_REQUEST)

        owner_to_transfer = old_lote.owner

        # 1. Actualizar el nuevo lote
        new_lote.owner = owner_to_transfer
        new_lote.status = 'vendido'
        new_lote.save()
        LoteHistory.objects.create(
            lote=new_lote, user=request.user, action="Propietario Asignado por Transferencia",
            details=f"Se asignó a {owner_to_transfer.full_name} desde el lote {old_lote}."
        )

        # 2. Actualizar el lote antiguo
        old_lote.owner = None
        old_lote.status = 'disponible'
        old_lote.save()
        LoteHistory.objects.create(
            lote=old_lote, user=request.user, action="Propietario Transferido",
            details=f"Se transfirió a {owner_to_transfer.full_name} al lote {new_lote}."
        )

        return Response(
            {"status": "Transferencia completada exitosamente."},
            status=status.HTTP_200_OK
        )