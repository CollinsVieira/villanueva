from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Permite acceso solo a usuarios administradores.
    """
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permite acceso al propietario del objeto o a administradores.
    """
    
    def has_object_permission(self, request, view, obj):
        # Los administradores pueden acceder a cualquier objeto
        if request.user.is_admin:
            return True
        
        # Los usuarios normales solo pueden acceder a sus propios objetos
        return obj == request.user


class IsWorkerOrAdmin(permissions.BasePermission):
    """
    Permite acceso a trabajadores y administradores.
    """
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                   (request.user.is_admin or request.user.is_worker))


class PublicReadOnlyOrAuthenticated(permissions.BasePermission):
    """
    Permite acceso público solo para el método GET (list/retrieve).
    Para otros métodos (POST, PUT, DELETE) requiere autenticación.
    """
    
    def has_permission(self, request, view):
        # Permitir acceso público para métodos seguros (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Para otros métodos (POST, PUT, DELETE), requerir autenticación
        return bool(request.user and request.user.is_authenticated)
    
    def has_object_permission(self, request, view, obj):
        # Para métodos seguros, permitir acceso público
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Para otros métodos, requerir autenticación
        return bool(request.user and request.user.is_authenticated) 