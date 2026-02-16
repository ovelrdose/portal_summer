from rest_framework import serializers
from apps.users.models import User
from apps.courses.models import Course, HomeworkSubmission


class UserStatsSerializer(serializers.ModelSerializer):
    """Сериализатор для выгрузки пользователей со статистикой."""

    full_name: str = serializers.CharField(read_only=True)
    role_display: str = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'role', 'role_display', 'created_at', 'last_login']
        read_only_fields = fields


class ActiveUserSerializer(serializers.Serializer):
    """Сериализатор для топ активных пользователей с детализацией активности."""

    id: int = serializers.IntegerField()
    full_name: str = serializers.CharField()
    email: str = serializers.EmailField()
    activity_count: int = serializers.IntegerField(help_text='Общий балл активности')

    # Детализация активности
    homework_count: int = serializers.IntegerField(help_text='Количество отправленных ДЗ')
    subscription_count: int = serializers.IntegerField(help_text='Количество подписок на курсы')
    recent_login: bool = serializers.BooleanField(help_text='Вход за последнюю неделю')
    last_login: str = serializers.DateTimeField(allow_null=True, help_text='Дата последнего входа')


class PopularCourseSerializer(serializers.Serializer):
    """Сериализатор для топ популярных курсов."""

    id: int = serializers.IntegerField()
    title: str = serializers.CharField()
    creator_name: str = serializers.CharField()
    subscribers_count: int = serializers.IntegerField()


class GlobalStatsSerializer(serializers.Serializer):
    """Сериализатор для глобальной статистики."""

    # Метрики пользователей
    total_users: int = serializers.IntegerField()
    new_users: int = serializers.IntegerField()

    # Метрики курсов
    total_courses: int = serializers.IntegerField()
    active_courses: int = serializers.IntegerField()
    new_courses: int = serializers.IntegerField()

    # Метрики активности (временно заглушки для будущей реализации)
    unique_visitors: int = serializers.IntegerField(default=0)
    page_views: int = serializers.IntegerField(default=0)


class CourseStatsSerializer(serializers.Serializer):
    """Сериализатор для статистики по курсу."""

    course_id: int = serializers.IntegerField()
    course_title: str = serializers.CharField()
    creator_name: str = serializers.CharField()

    # Основные метрики
    subscribers_count: int = serializers.IntegerField()
    completed_homework_count: int = serializers.IntegerField()
    overdue_homework_count: int = serializers.IntegerField()

    # Статистика оценок
    average_grade: float = serializers.FloatField(allow_null=True)
    grade_distribution: dict = serializers.DictField()
    total_graded: int = serializers.IntegerField()


class CourseListItemSerializer(serializers.ModelSerializer):
    """Сериализатор для списка курсов в статистике."""

    creator_name: str = serializers.CharField(source='creator.full_name', read_only=True)
    subscribers_count: int = serializers.IntegerField(source='subs_count', read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'creator_name', 'subscribers_count', 'created_at']
        read_only_fields = fields
