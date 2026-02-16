from rest_framework import permissions


class IsTeacherOrAdmin(permissions.BasePermission):
    """Доступ для преподавателей и администраторов."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_teacher
