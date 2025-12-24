
from django.conf import settings # <-- Añadir import
from django.conf.urls.static import static 

from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from django.contrib import admin

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('api/v1/', include([
        path('auth/', include('users.urls')),
        path('customers/', include('customers.urls')),
        path('lotes/', include('lotes.urls')),
        path('sales/', include('sales.urls')),
        path('payments/', include('payments.urls')),
        path('reports/', include('reports.urls')),
        path('dashboard/', include('dashboard.urls')),
    ])),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
