from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count

from apps.users.models import User
from apps.users.permissions import IsAdmin
from apps.courses.models import Course, HomeworkSubmission


@api_view(['GET'])
@permission_classes([IsAdmin])
def users_by_grade(request):
    """Статистика пользователей по классам"""
    stats = User.objects.filter(role=User.Role.USER).values('grade').annotate(
        count=Count('id')
    ).order_by('grade')

    return Response(list(stats))


@api_view(['GET'])
@permission_classes([IsAdmin])
def popular_courses(request):
    """Статистика по популярным курсам"""
    courses = Course.objects.filter(is_published=True).annotate(
        subs_count=Count('subscribers')
    ).order_by('-subs_count')[:10]

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
    """Топ-10 самых активных пользователей"""
    # Активность = количество прикрепленных ДЗ
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
    """Общая статистика для админской панели"""
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
