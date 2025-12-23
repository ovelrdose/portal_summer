"""
Кастомные permissions для приложения courses.

Обеспечивают контроль доступа к контенту курсов с учетом:
- Ролей пользователей (admin, teacher, student)
- Статуса публикации (is_published, publish_datetime)
- Подписки на курс (Subscription)
- Владения контентом (creator)
"""

from rest_framework import permissions
from django.utils import timezone
from .models import Course, Section, ContentElement, Subscription


class IsAccessibleOrAdmin(permissions.BasePermission):
    """
    Проверяет, доступен ли контент для пользователя.

    Логика доступа:
    - Админы и преподаватели: полный доступ ко всему контенту
    - Студенты: доступ только к разблокированному контенту

    Используется для Section и ContentElement.
    """

    def has_object_permission(self, request, view, obj):
        """
        Проверяет доступ к конкретному объекту.

        Args:
            request: HTTP запрос
            view: ViewSet
            obj: Section или ContentElement

        Returns:
            True если доступ разрешен, False иначе
        """
        user = request.user

        # Неаутентифицированные пользователи не имеют доступа
        if not user.is_authenticated:
            return False

        # Админы и преподаватели видят всё
        if user.is_admin or user.is_teacher:
            return True

        # Для студентов проверяем блокировку
        if hasattr(obj, 'is_locked_for_user'):
            return not obj.is_locked_for_user(user)

        return False


class IsCourseSubscriberOrAdmin(permissions.BasePermission):
    """
    Проверяет, подписан ли пользователь на курс.

    Логика доступа:
    - Админы и преподаватели: полный доступ
    - Владелец курса: полный доступ
    - Студенты: доступ только если подписаны на курс

    Используется для разделов и элементов курса.
    """

    def has_permission(self, request, view):
        """Базовая проверка: пользователь должен быть аутентифицирован"""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """
        Проверяет подписку на курс для конкретного объекта.

        Args:
            request: HTTP запрос
            view: ViewSet
            obj: Section или ContentElement

        Returns:
            True если пользователь имеет доступ к курсу
        """
        user = request.user

        # Админы имеют полный доступ
        if user.is_admin:
            return True

        # Определяем курс в зависимости от типа объекта
        course = None
        if isinstance(obj, Course):
            course = obj
        elif isinstance(obj, Section):
            course = obj.course
        elif isinstance(obj, ContentElement):
            course = obj.section.course

        if not course:
            return False

        # Владелец курса имеет полный доступ
        if course.creator == user:
            return True

        # Преподаватели имеют доступ ко всем опубликованным курсам
        if user.is_teacher and course.is_published:
            return True

        # Студенты должны быть подписаны на курс
        return Subscription.objects.filter(user=user, course=course).exists()
