# Generated manually for soft delete feature
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('lotes', '0002_remove_lote_contract_date_remove_lote_contract_file_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='lote',
            name='is_deleted',
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text='Indica si el lote fue retirado/eliminado lógicamente del inventario',
                verbose_name='Eliminado'
            ),
        ),
        migrations.AddField(
            model_name='lote',
            name='deleted_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Fecha y hora en que se retiró el lote del inventario',
                null=True,
                verbose_name='Fecha de Eliminación'
            ),
        ),
        migrations.AddField(
            model_name='lote',
            name='deleted_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='lotes_eliminados',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Eliminado por'
            ),
        ),
        migrations.AddField(
            model_name='lote',
            name='deletion_reason',
            field=models.TextField(
                blank=True,
                help_text='Motivo o justificación por el cual se retiró el lote',
                null=True,
                verbose_name='Motivo de Eliminación'
            ),
        ),
        migrations.RemoveConstraint(
            model_name='lote',
            name='unique_lote',
        ),
        migrations.AddConstraint(
            model_name='lote',
            constraint=models.UniqueConstraint(
                condition=models.Q(('is_deleted', False)),
                fields=('block', 'lot_number'),
                name='unique_active_lote'
            ),
        ),
        migrations.AddIndex(
            model_name='lote',
            index=models.Index(
                fields=['is_deleted', 'status'],
                name='lote_del_status_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='lote',
            index=models.Index(
                fields=['is_deleted', 'block', 'lot_number'],
                name='lote_del_block_num_idx'
            ),
        ),
    ]
