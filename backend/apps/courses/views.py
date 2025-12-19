from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.core.files.storage import default_storage
import os

from .models import Course, Section, ContentElement, HomeworkSubmission, Subscription
from .serializers import (
    CourseListSerializer,
    CourseDetailSerializer,
    CourseAdminSerializer,
    SectionSerializer,
    SectionListSerializer,
    ContentElementSerializer,
    ContentElementDetailSerializer,
    HomeworkSubmissionSerializer,
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
        # Для Course
        return obj.creator == request.user


class CourseViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'short_description']
    ordering_fields = ['created_at', 'title']

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_admin:
            return Course.objects.all()
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
        user = self.request.user
        # Преподаватель видит все ДЗ своих курсов
        if user.is_teacher:
            return HomeworkSubmission.objects.filter(
                element__section__course__creator=user
            ) | HomeworkSubmission.objects.filter(user=user)
        # Обычный пользователь видит только свои
        return HomeworkSubmission.objects.filter(user=user)

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create']:
            return [permissions.IsAuthenticated()]
        return [IsCourseOwnerOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsTeacher])
    def review(self, request, pk=None):
        """Оставить отзыв на ДЗ"""
        submission = self.get_object()
        teacher_comment = request.data.get('teacher_comment', '')

        submission.status = HomeworkSubmission.Status.REVIEWED
        submission.teacher_comment = teacher_comment
        submission.reviewed_at = timezone.now()
        submission.save()

        return Response({'status': 'Отзыв сохранен'})
