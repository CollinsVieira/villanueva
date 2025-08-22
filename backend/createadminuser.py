#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'villanueva_project.settings')
django.setup()

from users.models import User

user, created = User.objects.update_or_create(
    email='admin@admin.com',
    defaults={
        'username': 'adminuser',
        'first_name': 'Collins',
        'last_name': 'Videira',
        'role': 'admin',
        'is_superuser': True,
        'is_staff': True,
    }
)

# Muy importante: encriptar la contraseña
user.set_password('admin1234')
user.save()

if created:
    print(f"Superusuario creado exitosamente: {user.email}")
else:
    print(f"Superusuario ya existía, actualizado: {user.email}")
