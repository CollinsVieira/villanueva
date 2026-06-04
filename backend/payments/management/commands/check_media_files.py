import os

from django.conf import settings
from django.core.management.base import BaseCommand

from payments.models import Payment, PaymentSchedule
from sales.models import Venta


class Command(BaseCommand):
    help = 'Lista archivos de media referenciados en la BD que no existen en disco.'

    def handle(self, *args, **options):
        media_root = settings.MEDIA_ROOT
        self.stdout.write(self.style.NOTICE(f'MEDIA_ROOT = {media_root}'))

        missing = []
        ok = 0

        def check_file(label, file_field):
            nonlocal ok
            if not file_field:
                return
            name = file_field.name
            full_path = os.path.join(media_root, name)
            if os.path.isfile(full_path):
                ok += 1
            else:
                missing.append((label, name, full_path))

        for payment in Payment.objects.exclude(receipt_image='').iterator():
            check_file(f'Payment#{payment.pk} receipt_image', payment.receipt_image)
            check_file(f'Payment#{payment.pk} boleta_image', payment.boleta_image)

        for schedule in PaymentSchedule.objects.iterator():
            check_file(f'Schedule#{schedule.pk} receipt_image', schedule.receipt_image)
            check_file(f'Schedule#{schedule.pk} boleta_image', schedule.boleta_image)

        for venta in Venta.objects.exclude(contract_pdf='').iterator():
            check_file(f'Venta#{venta.pk} contract_pdf', venta.contract_pdf)

        self.stdout.write(self.style.SUCCESS(f'Archivos encontrados: {ok}'))

        if missing:
            self.stdout.write(self.style.ERROR(f'Archivos faltantes: {len(missing)}'))
            for label, name, full_path in missing[:50]:
                self.stdout.write(f'  - {label}: {name}')
                self.stdout.write(f'    esperado en: {full_path}')
            if len(missing) > 50:
                self.stdout.write(f'  ... y {len(missing) - 50} más')
            self.stdout.write(
                self.style.WARNING(
                    '\nCopia tus carpetas locales dentro del volumen Docker en /app/media/, '
                    'por ejemplo payment_receipts/, boleta_pagos/, contracts/'
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS('Todos los archivos referenciados existen.'))

        for folder in ('payment_receipts', 'boleta_pagos', 'contracts', 'avatars'):
            folder_path = os.path.join(media_root, folder)
            if os.path.isdir(folder_path):
                count = sum(1 for _ in os.scandir(folder_path))
                self.stdout.write(f'  {folder}/: {count} archivo(s) en disco')
