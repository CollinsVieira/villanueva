# Generated manually to remove due_date field from Payment model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0006_alter_payment_payment_date'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='payment',
            name='due_date',
        ),
    ]
