from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db.models import Avg, Count, Q
from django.core.files.storage import default_storage
import os

from .models import (
    Course,
    Section,
    ContentElement,
    HomeworkSubmission,
    HomeworkReviewHistory,
    Subscription
)
from .serializers import (
    CourseListSerializer,
    CourseDetailSerializer,
    CourseAdminSerializer,
    SectionSerializer,
    SectionListSerializer,
    ContentElementSerializer,
    ContentElementDetailSerializer,
    HomeworkSubmissionSerializer,
    HomeworkReviewHistorySerializer,
    SubscriptionSerializer
)
from apps.users.permissions import IsAdmin, IsTeacher, IsOwnerOrAdmin
from apps.users.serializers import UserPublicSerializer


class IsCourseOwnerOrAdmin(permissions.BasePermission):
    """Доступ владельцу курса или админу"""

    def has_permission(self, request, view):
        # Проверяем аутентификацию
        if not request.user.is_authenticated:
            return False

        # Админы и преподаватели имеют доступ
        if request.user.is_admin or request.user.is_teacher:
            # Для создания Section - проверяем владельца курса
            if view.action == 'create':
                course_id = request.data.get('course')
                if course_id:
                    try:
                        course = Course.objects.get(pk=course_id)
                        return course.creator == request.user or request.user.is_admin
                    except Course.DoesNotExist:
                        return False

                # Для создания ContentElement - проверяем через section
                section_id = request.data.get('section')
                if section_id:
                    try:
                        section = Section.objects.get(pk=section_id)
                        return section.course.creator == request.user or request.user.is_admin
                    except Section.DoesNotExist:
                        return False

            return True

        return False

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin:
            return True
        # Для Section и ContentElement - проверяем владельца курса
        if hasattr(obj, 'course'):
            return obj.course.creator == request.user
        if hasattr(obj, 'section'):
            return obj.section.course.creator == request.user
        # Для HomeworkSubmission - проверяем владельца курса через element
        if hasattr(obj, 'element'):
            return obj.element.section.course.creator == request.user
        # Для Course
        if hasattr(obj, 'creator'):
            return obj.creator == request.user
        return False


class IsCourseOwnerForHomework(permissions.BasePermission):
    """Проверяет, что пользователь является владельцем курса для домашнего задания"""

    def has_object_permission(self, request, view, obj):
        """
        Проверяет права доступа к объекту HomeworkSubmission.

        Args:
            request: HTTP запрос
            view: ViewSet
            obj: Объект HomeworkSubmission

        Returns:
            True если пользователь - админ или владелец курса
        """
        # Админы имеют полный доступ
        if request.user.is_admin:
            return True

        # Проверяем, что пользователь является владельцем курса
        # obj - это HomeworkSubmission
        # element.section.course.creator
        return obj.element.section.course.creator == request.user


class CourseViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'short_description']
    ordering_fields = ['created_at', 'title']

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_admin:
            return Course.objects.all()
        if user.is_authenticated and user.is_teacher:
            # Преподаватель видит опубликованные курсы + свои собственные (включая черновики)
            return Course.objects.filter(
                Q(is_published=True) | Q(creator=user)
            )
        return Course.objects.filter(is_published=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return CourseAdminSerializer
        return CourseDetailSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        if self.action == 'create':
            return [IsTeacher()]
        if self.action in ['subscribe', 'unsubscribe']:
            return [permissions.IsAuthenticated()]
        return [IsCourseOwnerOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def subscribe(self, request, pk=None):
        """Подписаться на курс"""
        course = self.get_object()
        subscription, created = Subscription.objects.get_or_create(
            user=request.user,
            course=course
        )
        if created:
            return Response({'status': 'Вы подписались на курс'})
        return Response({'status': 'Вы уже подписаны на этот курс'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unsubscribe(self, request, pk=None):
        """Отписаться от курса"""
        course = self.get_object()
        deleted, _ = Subscription.objects.filter(
            user=request.user,
            course=course
        ).delete()
        if deleted:
            return Response({'status': 'Вы отписались от курса'})
        return Response({'status': 'Вы не были подписаны на этот курс'})

    @action(detail=True, methods=['get'], permission_classes=[IsCourseOwnerOrAdmin])
    def subscribers(self, request, pk=None):
        """Список подписчиков курса"""
        course = self.get_object()
        subscribers = course.subscribers.all()
        serializer = UserPublicSerializer(subscribers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsCourseOwnerOrAdmin])
    def remove_subscriber(self, request, pk=None):
        """Удалить подписчика с курса"""
        course = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'Укажите user_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        deleted, _ = Subscription.objects.filter(
            user_id=user_id,
            course=course
        ).delete()
        if deleted:
            return Response({'status': 'Подписчик удален'})
        return Response({'status': 'Подписчик не найден'})

    @action(detail=False, methods=['get'])
    def my_courses(self, request):
        """Курсы, на которые подписан текущий пользователь"""
        if not request.user.is_authenticated:
            return Response([])
        subscriptions = Subscription.objects.filter(user=request.user)
        serializer = SubscriptionSerializer(
            subscriptions,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Последние созданные курсы"""
        courses = self.get_queryset()[:3]
        serializer = CourseListSerializer(
            courses,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsTeacher])
    def created_courses(self, request):
        """Курсы, созданные текущим пользователем"""
        courses = Course.objects.filter(creator=request.user)
        serializer = CourseListSerializer(courses, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsTeacher])
    def drafts(self, request):
        """Черновики курсов текущего пользователя"""
        drafts = Course.objects.filter(creator=request.user, is_published=False)
        serializer = CourseListSerializer(drafts, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsCourseOwnerOrAdmin])
    def publish(self, request, pk=None):
        course = self.get_object()
        course.is_published = True
        course.save()
        return Response({'status': 'Курс опубликован'})

    @action(detail=True, methods=['post'], permission_classes=[IsCourseOwnerOrAdmin])
    def unpublish(self, request, pk=None):
        course = self.get_object()
        course.is_published = False
        course.save()
        return Response({'status': 'Курс снят с публикации'})


class SectionViewSet(viewsets.ModelViewSet):
    """ViewSet для управления разделами курса"""
    queryset = Section.objects.all()
    serializer_class = SectionSerializer

    def get_queryset(self):
        course_id = self.request.query_params.get('course')
        queryset = Section.objects.all()
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return SectionListSerializer
        return SectionSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsCourseOwnerOrAdmin()]


class ContentElementViewSet(viewsets.ModelViewSet):
    """ViewSet для управления элементами контента раздела"""
    queryset = ContentElement.objects.all()
    serializer_class = ContentElementSerializer

    def get_queryset(self):
        section_id = self.request.query_params.get('section')
        queryset = ContentElement.objects.all()
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ContentElementDetailSerializer
        return ContentElementSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        if self.action == 'upload_image':
            return [IsCourseOwnerOrAdmin()]
        return [IsCourseOwnerOrAdmin()]

    @action(
        detail=False,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[IsCourseOwnerOrAdmin]
    )
    def upload_image(self, request):
        """
        Загружает изображение для использования в блоках контента.

        Валидация:
        - Допустимые типы: jpeg, jpg, png, gif, webp
        - Максимальный размер: 5 МБ

        Returns:
            {"url": "/media/courses/content/image.jpg", "filename": "image.jpg"}
        """
        if 'image' not in request.FILES:
            return Response(
                {'error': 'Файл изображения не предоставлен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        image_file = request.FILES['image']

        # Валидация типа файла
        allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
        file_extension = image_file.name.split('.')[-1].lower()

        if file_extension not in allowed_extensions:
            return Response(
                {
                    'error': f'Недопустимый тип файла. Разрешены: {", ".join(allowed_extensions)}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Валидация размера файла (максимум 5 МБ)
        max_size = 5 * 1024 * 1024  # 5 МБ в байтах
        if image_file.size > max_size:
            return Response(
                {'error': 'Размер файла превышает 5 МБ'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Сохраняем файл
        file_path = os.path.join('courses/content/', image_file.name)
        saved_path = default_storage.save(file_path, image_file)
        file_url = default_storage.url(saved_path)

        # Формируем полный URL для фронтенда
        if not file_url.startswith('http'):
            # Получаем базовый URL из request
            from django.conf import settings
            base_url = request.build_absolute_uri('/')[:-1]  # удаляем последний /
            file_url = base_url + file_url

        return Response({
            'url': file_url,
            'filename': image_file.name
        }, status=status.HTTP_201_CREATED)

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[IsCourseOwnerOrAdmin]
    )
    def reorder(self, request):
        """
        Массово обновляет порядок элементов контента.

        Ожидаемый формат:
        {
            "items": [
                {"id": 1, "order": 0},
                {"id": 2, "order": 1},
                {"id": 3, "order": 2}
            ]
        }

        Returns:
            {"status": "Порядок элементов обновлен", "updated": 3}
        """
        items = request.data.get('items', [])

        if not isinstance(items, list):
            return Response(
                {'error': 'Поле "items" должно быть списком'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not items:
            return Response(
                {'error': 'Список элементов не может быть пустым'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверяем формат данных
        for item in items:
            if not isinstance(item, dict) or 'id' not in item or 'order' not in item:
                return Response(
                    {'error': 'Каждый элемент должен содержать поля "id" и "order"'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Обновляем порядок в транзакции
        try:
            with transaction.atomic():
                updated_count = 0
                for item in items:
                    element_id = item['id']
                    new_order = item['order']

                    # Проверяем права доступа к элементу
                    try:
                        element = ContentElement.objects.select_related(
                            'section__course'
                        ).get(pk=element_id)

                        # Проверяем, что пользователь имеет право изменять этот элемент
                        if not (
                            request.user.is_admin or
                            element.section.course.creator == request.user
                        ):
                            return Response(
                                {'error': f'Нет прав для изменения элемента {element_id}'},
                                status=status.HTTP_403_FORBIDDEN
                            )

                        element.order = new_order
                        element.save(update_fields=['order'])
                        updated_count += 1

                    except ContentElement.DoesNotExist:
                        return Response(
                            {'error': f'Элемент с id={element_id} не найден'},
                            status=status.HTTP_404_NOT_FOUND
                        )

                return Response({
                    'status': 'Порядок элементов обновлен',
                    'updated': updated_count
                })

        except Exception as e:
            return Response(
                {'error': f'Ошибка при обновлении порядка: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class HomeworkSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = HomeworkSubmissionSerializer

    def get_queryset(self):
        """
        Возвращает queryset с оптимизацией через select_related.

        Оптимизация включает:
        - element (ForeignKey)
        - element__section (ForeignKey)
        - element__section__course (ForeignKey)
        - user (ForeignKey)

        Это предотвращает N+1 запросы при сериализации вложенной структуры.

        Query параметры:
        - course: ID курса для фильтрации
        - section: ID раздела для фильтрации
        - status: Статус (submitted/reviewed)
        """
        user = self.request.user

        # Базовый queryset с оптимизацией
        queryset = HomeworkSubmission.objects.select_related(
            'element',
            'element__section',
            'element__section__course',
            'user'
        )

        # Админы видят все ДЗ
        if user.is_authenticated and user.is_admin:
            pass  # Не фильтруем, админы видят всё
        # Преподаватель видит все ДЗ своих курсов + свои собственные
        elif user.is_authenticated and user.is_teacher:
            queryset = queryset.filter(
                Q(element__section__course__creator=user) | Q(user=user)
            )
        else:
            # Обычный пользователь видит только свои
            queryset = queryset.filter(user=user)

        # Фильтрация по query параметрам
        course_id = self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(element__section__course_id=course_id)

        section_id = self.request.query_params.get('section')
        if section_id:
            queryset = queryset.filter(element__section_id=section_id)

        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create']:
            return [permissions.IsAuthenticated()]
        return [IsCourseOwnerOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsTeacher, IsCourseOwnerForHomework])
    def review(self, request, pk=None):
        """
        Проверить домашнее задание и оставить оценку с комментарием.

        Request body:
            grade (int, optional): Оценка от 0 до 100
            teacher_comment (str, optional): Комментарий преподавателя

        Returns:
            Обновленный объект HomeworkSubmission через сериализатор
        """
        submission = self.get_object()

        # Получаем данные из запроса
        grade = request.data.get('grade')
        teacher_comment = request.data.get('teacher_comment', '')

        # Валидация оценки
        if grade is not None:
            try:
                grade = int(grade)
                if grade < 0 or grade > 100:
                    return Response(
                        {'error': 'Оценка должна быть в диапазоне от 0 до 100'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Оценка должна быть числом'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Сохраняем запись в историю ПЕРЕД обновлением submission
        with transaction.atomic():
            HomeworkReviewHistory.objects.create(
                submission=submission,
                reviewer=request.user,
                grade=grade,
                teacher_comment=teacher_comment
            )

            # Обновляем submission
            submission.status = HomeworkSubmission.Status.REVIEWED
            submission.grade = grade
            submission.teacher_comment = teacher_comment
            submission.reviewed_at = timezone.now()
            submission.save(update_fields=['status', 'grade', 'teacher_comment', 'reviewed_at'])

        # Возвращаем обновленный объект через сериализатор
        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='section-stats', permission_classes=[IsTeacher])
    def section_stats(self, request):
        """
        Статистика домашних заданий по разделам курса.

        Query params:
            course_id (required): ID курса для получения статистики

        Response:
            [{
                "section_id": int,
                "section_title": str,
                "total_submissions": int,
                "submitted_count": int,
                "reviewed_count": int,
                "avg_grade": float | null
            }]
        """
        course_id = request.query_params.get('course_id')

        if not course_id:
            return Response(
                {'error': 'Параметр course_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверяем существование курса и права доступа
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем, что пользователь - владелец курса или админ
        if not (request.user.is_admin or course.creator == request.user):
            return Response(
                {'error': 'Нет доступа к статистике этого курса'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Получаем все разделы курса
        sections = Section.objects.filter(course=course).order_by('order')

        stats = []
        for section in sections:
            # Получаем все элементы типа HOMEWORK в этом разделе
            homework_elements = ContentElement.objects.filter(
                section=section,
                content_type=ContentElement.ContentType.HOMEWORK
            )

            # Получаем все submissions для ДЗ в этом разделе
            submissions = HomeworkSubmission.objects.filter(
                element__in=homework_elements
            )

            # Подсчитываем статистику
            total_submissions = submissions.count()
            submitted_count = submissions.filter(
                status=HomeworkSubmission.Status.SUBMITTED
            ).count()
            reviewed_count = submissions.filter(
                status=HomeworkSubmission.Status.REVIEWED
            ).count()

            # Вычисляем среднюю оценку (только для проверенных работ с оценкой)
            avg_grade_result = submissions.filter(
                status=HomeworkSubmission.Status.REVIEWED,
                grade__isnull=False
            ).aggregate(avg_grade=Avg('grade'))

            avg_grade = avg_grade_result['avg_grade']
            # Округляем до 2 знаков после запятой, если есть значение
            if avg_grade is not None:
                avg_grade = round(avg_grade, 2)

            stats.append({
                'section_id': section.id,
                'section_title': section.title,
                'total_submissions': total_submissions,
                'submitted_count': submitted_count,
                'reviewed_count': reviewed_count,
                'avg_grade': avg_grade
            })

        return Response(stats)

    @action(detail=True, methods=['get'])
    def review_history(self, request, pk=None):
        """
        Получить историю изменений оценки для конкретного домашнего задания.

        Returns:
            Список записей истории проверок через HomeworkReviewHistorySerializer
        """
        submission = self.get_object()

        # Получаем историю проверок для этого submission
        history = HomeworkReviewHistory.objects.filter(
            submission=submission
        ).select_related('reviewer').order_by('-reviewed_at')

        serializer = HomeworkReviewHistorySerializer(
            history,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)
