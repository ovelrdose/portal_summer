from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Доступ только для администраторов"""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin


class IsTeacher(permissions.BasePermission):
    """Доступ для преподавателей и админов"""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_teacher


class IsOwnerOrAdmin(permissions.BasePermission):
    """Доступ владельцу объекта или админу"""

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin:
            return True

        # Проверяем наличие поля owner или user
        owner = getattr(obj, 'owner', None) or getattr(obj, 'user', None)
        return owner == request.user
