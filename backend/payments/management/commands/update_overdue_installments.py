from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.models import PaymentSchedule


class Command(BaseCommand):
    help = 'Actualiza el estado de las cuotas pendientes que han vencido a "overdue"'

    def handle(self, *args, **options):
        today = timezone.now().date()
        
        # Buscar cuotas pendientes que ya pasaron su fecha de vencimiento
        pending_overdue = PaymentSchedule.objects.filter(
            status='pending',
            due_date__lt=today
        )
        
        count = pending_overdue.count()
        
        if count > 0:
            # Actualizar a 'overdue'
            pending_overdue.update(status='overdue')
            self.stdout.write(
                self.style.SUCCESS(
                    f'[{timezone.now().strftime("%Y-%m-%d %H:%M:%S")}] '
                    f'Se actualizaron {count} cuotas a estado "vencido"'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'[{timezone.now().strftime("%Y-%m-%d %H:%M:%S")}] '
                    f'No hay cuotas pendientes vencidas para actualizar'
                )
            )
