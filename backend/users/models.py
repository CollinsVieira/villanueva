from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

# Create your models here.
class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrador'),
        ('worker', 'Trabajador'),
    ]
    
    # Override groups and user_permissions with custom related_names
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name=_('groups'),
        blank=True,
        help_text=_(
            'The groups this user belongs to. A user will get all permissions '
            'granted to each of their groups.'
        ),
        related_name='custom_user_set',
        related_query_name='custom_user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name=_('user permissions'),
        blank=True,
        help_text=_('Specific permissions for this user.'),
        related_name='custom_user_set',
        related_query_name='custom_user',
    )
    
    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='worker',
        verbose_name=_('role')
    )

    avatar = models.ImageField(
        upload_to='avatars/',
        null=True,
        blank=True,
        verbose_name=_('avatar')
    )
    phone = models.CharField(
        max_length=15,
        blank=True,
        verbose_name=_('phone number')
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    
    @property
    def is_admin(self):
        return self.role == 'admin'
    
    @property
    def is_worker(self):
        return self.role == 'worker' 


