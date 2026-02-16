import csv
from datetime import datetime, timedelta
from typing import Optional

from django.db.models import Count, Avg, Q, Case, When, IntegerField
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.users.models import User
from apps.users.permissions import IsAdmin
from apps.courses.models import Course, HomeworkSubmission, ContentElement
from .permissions import IsTeacherOrAdmin
from .serializers import (
    UserStatsSerializer,
    ActiveUserSerializer,
    PopularCourseSerializer,
    GlobalStatsSerializer,
    CourseStatsSerializer,
    CourseListItemSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    """Стандартная пагинация для списков."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def parse_date_param(date_str: Optional[str]) -> Optional[datetime]:
    """
    Парсит дату из query параметра.

    Args:
        date_str: Строка даты в формате YYYY-MM-DD

    Returns:
        datetime объект или None
    """
    if not date_str:
        return None
    try:
        return timezone.make_aware(datetime.strptime(date_str, '%Y-%m-%d'))
    except (ValueError, TypeError):
        return None


# =============================================================================
# ГЛОБАЛЬНАЯ СТАТИСТИКА (только для администраторов)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAdmin])
def global_stats(request):
    """
    Глобальная статистика портала с фильтрацией по датам.

    Query параметры:
        - date_from: начало периода (YYYY-MM-DD)
        - date_to: конец периода (YYYY-MM-DD)
    """
    date_from = parse_date_param(request.query_params.get('date_from'))
    date_to = parse_date_param(request.query_params.get('date_to'))

    # Базовые метрики
    total_users = User.objects.count()
    total_courses = Course.objects.count()
    active_courses = Course.objects.filter(is_published=True).count()

    # Метрики за период
    new_users_qs = User.objects.all()
    new_courses_qs = Course.objects.all()

    if date_from:
        new_users_qs = new_users_qs.filter(created_at__gte=date_from)
        new_courses_qs = new_courses_qs.filter(created_at__gte=date_from)

    if date_to:
        # Добавляем 1 день для включительного поиска
        date_to_inclusive = timezone.make_aware(
            datetime.combine(date_to.date(), datetime.max.time())
        )
        new_users_qs = new_users_qs.filter(created_at__lte=date_to_inclusive)
        new_courses_qs = new_courses_qs.filter(created_at__lte=date_to_inclusive)

    new_users = new_users_qs.count()
    new_courses = new_courses_qs.count()

    # TODO: Реализовать трекинг посещений (требует отдельной модели)
    # Пока возвращаем заглушки
    unique_visitors = 0
    page_views = 0

    data = {
        'total_users': total_users,
        'new_users': new_users,
        'total_courses': total_courses,
        'active_courses': active_courses,
        'new_courses': new_courses,
        'unique_visitors': unique_visitors,
        'page_views': page_views,
    }

    serializer = GlobalStatsSerializer(data)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def top_active_users(request):
    """
    Топ-10 активных пользователей.

    Комбинированная система баллов активности:
    - Отправленное ДЗ: 5 баллов
    - Подписка на курс: 2 балла
    - Вход за последнюю неделю: 3 балла

    Query параметры:
        - date_from: начало периода (YYYY-MM-DD)
        - date_to: конец периода (YYYY-MM-DD)
        - limit: количество пользователей (по умолчанию 10)
    """
    date_from = parse_date_param(request.query_params.get('date_from'))
    date_to = parse_date_param(request.query_params.get('date_to'))
    limit = int(request.query_params.get('limit', 10))

    # Определяем период для фильтрации
    homework_filter = Q()
    subscription_filter = Q()

    if date_from:
        homework_filter &= Q(homework_submissions__submitted_at__gte=date_from)
        subscription_filter &= Q(subscription__subscribed_at__gte=date_from)

    if date_to:
        date_to_inclusive = timezone.make_aware(
            datetime.combine(date_to.date(), datetime.max.time())
        )
        homework_filter &= Q(homework_submissions__submitted_at__lte=date_to_inclusive)
        subscription_filter &= Q(subscription__subscribed_at__lte=date_to_inclusive)

    # Дата для определения "недавний вход" (7 дней назад)
    week_ago = timezone.now() - timedelta(days=7)

    # Аннотируем пользователей метриками активности
    users = User.objects.annotate(
        # Количество отправленных ДЗ
        homework_count=Count(
            'homework_submissions',
            filter=homework_filter if homework_filter else Q(),
            distinct=True
        ),
        # Количество подписок на курсы
        subscription_count=Count(
            'subscription',
            filter=subscription_filter if subscription_filter else Q(),
            distinct=True
        ),
        # Был ли вход за последнюю неделю (0 или 1)
        recent_login_score=Case(
            When(last_login__gte=week_ago, then=3),  # 3 балла за недавний вход
            default=0,
            output_field=IntegerField()
        )
    ).annotate(
        # Вычисляем общий балл активности
        # homework_count * 5 + subscription_count * 2 + recent_login_score
        activity_score=(
            Count('homework_submissions', filter=homework_filter if homework_filter else Q(), distinct=True) * 5 +
            Count('subscription', filter=subscription_filter if subscription_filter else Q(), distinct=True) * 2 +
            Case(When(last_login__gte=week_ago, then=3), default=0, output_field=IntegerField())
        )
    ).filter(activity_score__gt=0).order_by('-activity_score', '-created_at')[:limit]

    data = [
        {
            'id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'activity_count': user.activity_score,
            'homework_count': user.homework_count,
            'subscription_count': user.subscription_count,
            'recent_login': user.last_login >= week_ago if user.last_login else False,
            'last_login': user.last_login,
        }
        for user in users
    ]

    serializer = ActiveUserSerializer(data, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def export_active_users_csv(request):
    """
    Экспорт активных пользователей в CSV.

    Query параметры:
        - date_from: начало периода (YYYY-MM-DD)
        - date_to: конец периода (YYYY-MM-DD)
        - limit: количество пользователей (по умолчанию 10)
    """
    date_from = parse_date_param(request.query_params.get('date_from'))
    date_to = parse_date_param(request.query_params.get('date_to'))
    limit = int(request.query_params.get('limit', 10))

    # Определяем период для фильтрации
    homework_filter = Q()
    subscription_filter = Q()

    if date_from:
        homework_filter &= Q(homework_submissions__submitted_at__gte=date_from)
        subscription_filter &= Q(subscription__subscribed_at__gte=date_from)

    if date_to:
        date_to_inclusive = timezone.make_aware(
            datetime.combine(date_to.date(), datetime.max.time())
        )
        homework_filter &= Q(homework_submissions__submitted_at__lte=date_to_inclusive)
        subscription_filter &= Q(subscription__subscribed_at__lte=date_to_inclusive)

    # Дата для определения "недавний вход" (7 дней назад)
    week_ago = timezone.now() - timedelta(days=7)

    # Аннотируем пользователей метриками активности
    users = User.objects.annotate(
        homework_count=Count(
            'homework_submissions',
            filter=homework_filter if homework_filter else Q(),
            distinct=True
        ),
        subscription_count=Count(
            'subscription',
            filter=subscription_filter if subscription_filter else Q(),
            distinct=True
        ),
        recent_login_score=Case(
            When(last_login__gte=week_ago, then=3),
            default=0,
            output_field=IntegerField()
        )
    ).annotate(
        activity_score=(
            Count('homework_submissions', filter=homework_filter if homework_filter else Q(), distinct=True) * 5 +
            Count('subscription', filter=subscription_filter if subscription_filter else Q(), distinct=True) * 2 +
            Case(When(last_login__gte=week_ago, then=3), default=0, output_field=IntegerField())
        )
    ).filter(activity_score__gt=0).order_by('-activity_score', '-created_at')[:limit]

    # Создаем HTTP ответ с CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="active_users_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

    # Добавляем BOM для корректного отображения кириллицы в Excel
    response.write('\ufeff')

    writer = csv.writer(response)
    writer.writerow(['#', 'Имя', 'Email', 'Общий балл', 'ДЗ', 'Подписки', 'Вход за неделю', 'Последний вход'])

    for index, user in enumerate(users, 1):
        writer.writerow([
            index,
            user.full_name,
            user.email,
            user.activity_score,
            user.homework_count,
            user.subscription_count,
            'Да' if user.last_login and user.last_login >= week_ago else 'Нет',
            user.last_login.strftime('%Y-%m-%d %H:%M:%S') if user.last_login else 'Никогда',
        ])

    return response


@api_view(['GET'])
@permission_classes([IsAdmin])
def top_popular_courses(request):
    """
    Топ-10 популярных курсов по количеству подписчиков.

    Query параметры:
        - limit: количество курсов (по умолчанию 10)
    """
    limit = int(request.query_params.get('limit', 10))

    courses = Course.objects.select_related('creator').annotate(
        subs_count=Count('subscriptions')
    ).order_by('-subs_count', '-created_at')[:limit]

    data = [
        {
            'id': course.id,
            'title': course.title,
            'creator_name': course.creator.full_name,
            'subscribers_count': course.subs_count,
        }
        for course in courses
    ]

    serializer = PopularCourseSerializer(data, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def users_by_grade_stats(request):
    """
    Распределение пользователей по классам.

    Возвращает количество пользователей для каждого класса (1-11).
    """
    stats = User.objects.filter(
        role=User.Role.USER,
        grade__isnull=False
    ).values('grade').annotate(
        count=Count('id')
    ).order_by('grade')

    # Формируем полный список классов 1-11 с нулями для отсутствующих
    grade_distribution = {i: 0 for i in range(1, 12)}
    for stat in stats:
        grade_distribution[stat['grade']] = stat['count']

    # Преобразуем в список для фронтенда
    result = [
        {'grade': grade, 'count': count}
        for grade, count in grade_distribution.items()
    ]

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAdmin])
def users_geography_stats(request):
    """
    Географическое распределение пользователей.

    Возвращает ТОП-5 городов и ТОП-5 стран по количеству пользователей.
    """
    # ТОП-5 стран
    top_countries = User.objects.filter(
        country__isnull=False
    ).exclude(
        country__exact=''
    ).values('country').annotate(
        count=Count('id')
    ).order_by('-count')[:5]

    # ТОП-5 городов
    top_cities = User.objects.filter(
        city__isnull=False
    ).exclude(
        city__exact=''
    ).values('city', 'country').annotate(
        count=Count('id')
    ).order_by('-count')[:5]

    return Response({
        'top_countries': list(top_countries),
        'top_cities': list(top_cities)
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def export_users_by_grade_csv(request):
    """
    Экспорт распределения пользователей по классам в CSV.
    """
    stats = User.objects.filter(
        role=User.Role.USER,
        grade__isnull=False
    ).values('grade').annotate(
        count=Count('id')
    ).order_by('grade')

    # Формируем полный список классов 1-11 с нулями для отсутствующих
    grade_distribution = {i: 0 for i in range(1, 12)}
    for stat in stats:
        grade_distribution[stat['grade']] = stat['count']

    # Создаем CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="users_by_grade_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

    # BOM для Excel
    response.write('\ufeff')

    writer = csv.writer(response)
    writer.writerow(['Класс', 'Количество участников'])

    total = 0
    for grade in range(1, 12):
        count = grade_distribution[grade]
        writer.writerow([grade, count])
        total += count

    writer.writerow([])
    writer.writerow(['Всего', total])

    return response


@api_view(['GET'])
@permission_classes([IsAdmin])
def export_users_geography_csv(request):
    """
    Экспорт географии пользователей в CSV.
    """
    # Все страны
    countries = User.objects.filter(
        country__isnull=False
    ).exclude(
        country__exact=''
    ).values('country').annotate(
        count=Count('id')
    ).order_by('-count')

    # Все города
    cities = User.objects.filter(
        city__isnull=False
    ).exclude(
        city__exact=''
    ).values('city', 'country').annotate(
        count=Count('id')
    ).order_by('-count')

    # Создаем CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="users_geography_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

    # BOM для Excel
    response.write('\ufeff')

    writer = csv.writer(response)

    # Раздел: Страны
    writer.writerow(['География участников'])
    writer.writerow([])
    writer.writerow(['Распределение по странам'])
    writer.writerow(['Страна', 'Количество'])

    total_countries = 0
    for country_stat in countries:
        writer.writerow([country_stat['country'], country_stat['count']])
        total_countries += country_stat['count']

    writer.writerow(['Всего', total_countries])
    writer.writerow([])

    # Раздел: Города
    writer.writerow(['Распределение по городам'])
    writer.writerow(['Город', 'Страна', 'Количество'])

    total_cities = 0
    for city_stat in cities:
        writer.writerow([city_stat['city'], city_stat.get('country', ''), city_stat['count']])
        total_cities += city_stat['count']

    writer.writerow(['', 'Всего', total_cities])

    return response


@api_view(['GET'])
@permission_classes([IsAdmin])
def users_by_role(request):
    """
    Выгрузка пользователей с фильтрацией по ролям и пагинацией.

    Query параметры:
        - role: фильтр по роли (admin, teacher, user)
        - page: номер страницы
        - page_size: размер страницы
    """
    role_filter = request.query_params.get('role')

    queryset = User.objects.select_related().order_by('-created_at')

    if role_filter and role_filter in dict(User.Role.choices):
        queryset = queryset.filter(role=role_filter)

    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(queryset, request)

    if page is not None:
        serializer = UserStatsSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = UserStatsSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def export_users_csv(request):
    """
    Экспорт пользователей в CSV.

    Query параметры:
        - role: фильтр по роли (admin, teacher, user)
    """
    role_filter = request.query_params.get('role')

    queryset = User.objects.order_by('-created_at')

    if role_filter and role_filter in dict(User.Role.choices):
        queryset = queryset.filter(role=role_filter)

    # Создаем HTTP ответ с CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="users_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

    # Добавляем BOM для корректного отображения кириллицы в Excel
    response.write('\ufeff')

    writer = csv.writer(response)
    writer.writerow(['ID', 'Имя', 'Email', 'Роль', 'Дата регистрации', 'Последний вход'])

    for user in queryset:
        writer.writerow([
            user.id,
            user.full_name,
            user.email,
            user.get_role_display(),
            user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else '',
            user.last_login.strftime('%Y-%m-%d %H:%M:%S') if user.last_login else 'Никогда',
        ])

    return response


# =============================================================================
# СТАТИСТИКА КУРСОВ (для администраторов и преподавателей)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsTeacherOrAdmin])
def courses_list_for_stats(request):
    """
    Список курсов для выбора в статистике.

    Для администратора: все курсы.
    Для преподавателя: только его курсы.
    """
    if request.user.is_admin:
        queryset = Course.objects.all()
    else:
        queryset = Course.objects.filter(creator=request.user)

    queryset = queryset.select_related('creator').annotate(
        subs_count=Count('subscriptions')
    ).order_by('-created_at')

    serializer = CourseListItemSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsTeacherOrAdmin])
def course_stats(request, course_id):
    """
    Детальная статистика по конкретному курсу.

    Администраторы могут просматривать любые курсы.
    Преподаватели - только свои.
    """
    try:
        if request.user.is_admin:
            course = Course.objects.select_related('creator').get(id=course_id)
        else:
            course = Course.objects.select_related('creator').get(
                id=course_id,
                creator=request.user
            )
    except Course.DoesNotExist:
        return Response(
            {'detail': 'Курс не найден или у вас нет доступа к нему.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Количество подписчиков
    subscribers_count = course.subscriptions.count()

    # Получаем все элементы ДЗ в курсе
    homework_elements = ContentElement.objects.filter(
        section__course=course,
        content_type=ContentElement.ContentType.HOMEWORK
    ).values_list('id', flat=True)

    # Количество выполненных/проверенных ДЗ
    completed_homework_count = HomeworkSubmission.objects.filter(
        element_id__in=homework_elements,
        status=HomeworkSubmission.Status.REVIEWED
    ).count()

    # Количество просроченных ДЗ
    # TODO: Требует добавления поля deadline в ContentElement или HomeworkSubmission
    # Пока возвращаем 0
    overdue_homework_count = 0

    # Статистика оценок
    graded_submissions = HomeworkSubmission.objects.filter(
        element_id__in=homework_elements,
        grade__isnull=False
    )

    total_graded = graded_submissions.count()

    if total_graded > 0:
        # Средняя оценка
        avg_grade = graded_submissions.aggregate(avg=Avg('grade'))['avg']

        # Распределение оценок по диапазонам (0-20, 21-40, 41-60, 61-80, 81-100)
        grade_distribution = graded_submissions.aggregate(
            range_0_20=Count(Case(When(grade__lte=20, then=1), output_field=IntegerField())),
            range_21_40=Count(Case(When(grade__gte=21, grade__lte=40, then=1), output_field=IntegerField())),
            range_41_60=Count(Case(When(grade__gte=41, grade__lte=60, then=1), output_field=IntegerField())),
            range_61_80=Count(Case(When(grade__gte=61, grade__lte=80, then=1), output_field=IntegerField())),
            range_81_100=Count(Case(When(grade__gte=81, grade__lte=100, then=1), output_field=IntegerField())),
        )
    else:
        avg_grade = None
        grade_distribution = {
            'range_0_20': 0,
            'range_21_40': 0,
            'range_41_60': 0,
            'range_61_80': 0,
            'range_81_100': 0,
        }

    data = {
        'course_id': course.id,
        'course_title': course.title,
        'creator_name': course.creator.full_name,
        'subscribers_count': subscribers_count,
        'completed_homework_count': completed_homework_count,
        'overdue_homework_count': overdue_homework_count,
        'average_grade': round(avg_grade, 2) if avg_grade else None,
        'grade_distribution': grade_distribution,
        'total_graded': total_graded,
    }

    serializer = CourseStatsSerializer(data)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsTeacherOrAdmin])
def export_course_stats_csv(request, course_id):
    """
    Экспорт статистики курса в CSV.

    Администраторы могут экспортировать любые курсы.
    Преподаватели - только свои.
    """
    try:
        if request.user.is_admin:
            course = Course.objects.select_related('creator').get(id=course_id)
        else:
            course = Course.objects.select_related('creator').get(
                id=course_id,
                creator=request.user
            )
    except Course.DoesNotExist:
        return Response(
            {'detail': 'Курс не найден или у вас нет доступа к нему.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Получаем статистику (дублируем логику из course_stats)
    subscribers_count = course.subscriptions.count()

    homework_elements = ContentElement.objects.filter(
        section__course=course,
        content_type=ContentElement.ContentType.HOMEWORK
    ).values_list('id', flat=True)

    completed_homework_count = HomeworkSubmission.objects.filter(
        element_id__in=homework_elements,
        status=HomeworkSubmission.Status.REVIEWED
    ).count()

    overdue_homework_count = 0

    graded_submissions = HomeworkSubmission.objects.filter(
        element_id__in=homework_elements,
        grade__isnull=False
    )

    total_graded = graded_submissions.count()
    avg_grade = None

    if total_graded > 0:
        avg_grade = graded_submissions.aggregate(avg=Avg('grade'))['avg']
        grade_distribution = graded_submissions.aggregate(
            range_0_20=Count(Case(When(grade__lte=20, then=1), output_field=IntegerField())),
            range_21_40=Count(Case(When(grade__gte=21, grade__lte=40, then=1), output_field=IntegerField())),
            range_41_60=Count(Case(When(grade__gte=41, grade__lte=60, then=1), output_field=IntegerField())),
            range_61_80=Count(Case(When(grade__gte=61, grade__lte=80, then=1), output_field=IntegerField())),
            range_81_100=Count(Case(When(grade__gte=81, grade__lte=100, then=1), output_field=IntegerField())),
        )
    else:
        grade_distribution = {
            'range_0_20': 0,
            'range_21_40': 0,
            'range_41_60': 0,
            'range_61_80': 0,
            'range_81_100': 0,
        }

    # Создаем CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="course_{course_id}_stats_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

    # BOM для Excel
    response.write('\ufeff')

    writer = csv.writer(response)
    writer.writerow(['Статистика курса'])
    writer.writerow(['Название курса', course.title])
    writer.writerow(['Автор', course.creator.full_name])
    writer.writerow(['Дата создания', course.created_at.strftime('%Y-%m-%d')])
    writer.writerow([])

    writer.writerow(['Метрика', 'Значение'])
    writer.writerow(['Количество подписчиков', subscribers_count])
    writer.writerow(['Выполненных ДЗ (проверено)', completed_homework_count])
    writer.writerow(['Просроченных ДЗ', overdue_homework_count])
    writer.writerow(['Средняя оценка', round(avg_grade, 2) if avg_grade else 'Н/Д'])
    writer.writerow(['Всего оценок выставлено', total_graded])
    writer.writerow([])

    writer.writerow(['Распределение оценок'])
    writer.writerow(['Диапазон', 'Количество'])
    writer.writerow(['0-20 баллов', grade_distribution['range_0_20']])
    writer.writerow(['21-40 баллов', grade_distribution['range_21_40']])
    writer.writerow(['41-60 баллов', grade_distribution['range_41_60']])
    writer.writerow(['61-80 баллов', grade_distribution['range_61_80']])
    writer.writerow(['81-100 баллов', grade_distribution['range_81_100']])

    return response


# =============================================================================
# LEGACY ENDPOINTS (для обратной совместимости)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAdmin])
def users_by_grade(request):
    """Статистика пользователей по классам (legacy)"""
    stats = User.objects.filter(role=User.Role.USER).values('grade').annotate(
        count=Count('id')
    ).order_by('grade')

    return Response(list(stats))


@api_view(['GET'])
@permission_classes([IsAdmin])
def popular_courses(request):
    """Статистика по популярным курсам (legacy)"""
    courses = Course.objects.annotate(
        subs_count=Count('subscriptions')
    ).order_by('-subs_count', '-created_at')[:10]

    data = [
        {
            'id': course.id,
            'title': course.title,
            'creator': course.creator.full_name,
            'subscribers_count': course.subs_count
        }
        for course in courses
    ]

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def active_users(request):
    """Топ-10 самых активных пользователей (legacy)"""
    users = User.objects.annotate(
        homework_count=Count('homework_submissions')
    ).order_by('-homework_count')[:10]

    data = [
        {
            'id': user.id,
            'full_name': user.full_name,
            'grade': user.grade,
            'homework_count': user.homework_count
        }
        for user in users
    ]

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def dashboard_stats(request):
    """Общая статистика для админской панели (legacy)"""
    total_users = User.objects.count()
    total_teachers = User.objects.filter(role=User.Role.TEACHER).count()
    total_courses = Course.objects.count()
    published_courses = Course.objects.filter(is_published=True).count()
    total_homework = HomeworkSubmission.objects.count()
    pending_homework = HomeworkSubmission.objects.filter(
        status=HomeworkSubmission.Status.SUBMITTED
    ).count()

    return Response({
        'total_users': total_users,
        'total_teachers': total_teachers,
        'total_courses': total_courses,
        'published_courses': published_courses,
        'total_homework': total_homework,
        'pending_homework': pending_homework
    })
