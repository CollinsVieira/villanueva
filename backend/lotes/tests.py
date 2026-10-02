from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date

from lotes.models import Lote, LoteHistory
from customers.models import Customer
from sales.models import Venta
from payments.models import Payment

User = get_user_model()


class LoteSoftDeleteTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testworker',
            email='worker@test.com',
            password='password123',
            role='worker'
        )
        self.customer = Customer.objects.create(
            first_name='Juan',
            last_name='Perez',
            document_type='DNI',
            document_number='12345678',
            created_by=self.user
        )
        self.lote = Lote.objects.create(
            block='A',
            lot_number='1',
            area=Decimal('200.00'),
            price=Decimal('50000.00'),
            status='disponible',
            created_by=self.user
        )

    def test_soft_delete_preserves_lote_and_history(self):
        """Prueba que la eliminación lógica no elimina físicamente el registro y crea historial."""
        self.assertFalse(self.lote.is_deleted)
        self.assertIsNone(self.lote.deleted_at)

        # Realizar soft delete
        self.lote.soft_delete(user=self.user, reason='Ajuste comercial')

        # El lote no debe aparecer en objects.all()
        self.assertEqual(Lote.objects.count(), 0)
        self.assertFalse(Lote.objects.filter(id=self.lote.id).exists())

        # El lote SÍ debe aparecer en all_objects.all()
        self.assertEqual(Lote.all_objects.count(), 1)
        deleted_lote = Lote.all_objects.get(id=self.lote.id)
        self.assertTrue(deleted_lote.is_deleted)
        self.assertIsNotNone(deleted_lote.deleted_at)
        self.assertEqual(deleted_lote.deleted_by, self.user)
        self.assertEqual(deleted_lote.deletion_reason, 'Ajuste comercial')

        # Verificar que se registró en LoteHistory
        history = LoteHistory.objects.filter(lote=deleted_lote, action='Eliminación de Lote')
        self.assertTrue(history.exists())
        self.assertIn('Ajuste comercial', history.first().details)

    def test_soft_delete_preserves_sales_and_payments(self):
        """Prueba que un lote con venta y pagos asociados puede retirarse sin perder relaciones históricas."""
        # Crear venta
        venta = Venta.create_sale(
            lote=self.lote,
            customer=self.customer,
            sale_price=Decimal('50000.00'),
            payment_day=15,
            financing_months=12,
            initial_payment=Decimal('5000.00')
        )
        self.lote.refresh_from_db()
        self.assertEqual(self.lote.status, 'vendido')

        # Registrar un pago
        payment = Payment.objects.create(
            venta=venta,
            amount=Decimal('1000.00'),
            payment_date=date.today(),
            method='transferencia',
            payment_type='installment',
            receipt_number='OP-001'
        )

        # Retirar el lote del inventario
        self.lote.soft_delete(user=self.user, reason='Retirado por solicitud')

        # Verificar que la venta sigue existiendo y asociada al lote y cliente
        self.assertTrue(Venta.objects.filter(id=venta.id).exists())
        venta.refresh_from_db()
        self.assertEqual(venta.lote.id, self.lote.id)
        self.assertEqual(venta.customer.id, self.customer.id)

        # Verificar que el pago sigue existiendo
        self.assertTrue(Payment.objects.filter(id=payment.id).exists())

        # Verificar que los cronogramas siguen existiendo
        self.assertTrue(venta.payment_schedules.exists())

    def test_cannot_create_sale_on_deleted_lote(self):
        """Prueba que no se puede crear una venta en un lote retirado/eliminado."""
        self.lote.soft_delete(user=self.user)

        with self.assertRaises(ValidationError):
            Venta.create_sale(
                lote=self.lote,
                customer=self.customer,
                sale_price=Decimal('50000.00'),
                payment_day=15,
                financing_months=12
            )

    def test_restore_lote(self):
        """Prueba que un lote eliminado puede ser restaurado al inventario activo."""
        self.lote.soft_delete(user=self.user, reason='Temporal')
        self.assertEqual(Lote.objects.count(), 0)

        # Restaurar
        self.lote.restore(user=self.user)
        self.lote.refresh_from_db()

        self.assertFalse(self.lote.is_deleted)
        self.assertIsNone(self.lote.deleted_at)
        self.assertIsNone(self.lote.deleted_by)
        self.assertIsNone(self.lote.deletion_reason)
        self.assertEqual(Lote.objects.count(), 1)

        # Verificar registro en historial
        history = LoteHistory.objects.filter(lote=self.lote, action='Restauración de Lote')
        self.assertTrue(history.exists())

    def test_restore_collision_prevention(self):
        """Prueba que no se puede restaurar un lote si ya existe otro activo con la misma Mz y Lote."""
        self.lote.soft_delete(user=self.user)

        # Crear nuevo lote activo con la misma manzana y número
        Lote.objects.create(
            block='A',
            lot_number='1',
            area=Decimal('220.00'),
            price=Decimal('55000.00'),
            status='disponible',
            created_by=self.user
        )

        # Intentar restaurar el lote original debe fallar con ValidationError
        with self.assertRaises(ValidationError):
            self.lote.restore(user=self.user)
