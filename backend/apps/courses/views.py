from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
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
    SubscriptionSerializer,
    CourseScheduleItemSerializer
)
from apps.users.permissions import IsAdmin, IsTeacher, IsOwnerOrAdmin
from apps.users.serializers import UserPublicSerializer
from .permissions import IsAccessibleOrAdmin, IsCourseSubscriberOrAdmin


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


def _get_homework_schedule_for_course(course, user, now):
    """
    Получает список ДЗ с дедлайнами для конкретного курса.

    Возвращает только ДЗ:
    - С установленным дедлайном
    - Без ответа от пользователя ИЛИ ответ требует доработки
    - Из опубликованных и разблокированных разделов/элементов
    """
    from datetime import datetime
    homework_items = []

    # Получаем все разделы курса (опубликованные и разблокированные)
    sections = course.sections.filter(
        is_published=True
    ).filter(
        Q(publish_datetime__isnull=True) | Q(publish_datetime__lte=now)
    ).prefetch_related('elements')

    for section in sections:
        # Получаем все элементы типа homework с дедлайном
        homework_elements = section.elements.filter(
            content_type=ContentElement.ContentType.HOMEWORK,
            is_published=True
        ).filter(
            Q(publish_datetime__isnull=True) | Q(publish_datetime__lte=now)
        )

        for hw_element in homework_elements:
            deadline = hw_element.data.get('deadline') if hw_element.data else None

            if not deadline:
                continue  # Пропускаем ДЗ без дедлайна

            # Парсим дедлайн
            try:
                if isinstance(deadline, str):
                    deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                else:
                    deadline_dt = deadline

                # Делаем aware если нужно
                if timezone.is_naive(deadline_dt):
                    deadline_dt = timezone.make_aware(deadline_dt)

            except (ValueError, AttributeError, TypeError) as e:
                continue  # Пропускаем если не удалось распарсить

            # Проверяем наличие ответа
            submission = HomeworkSubmission.objects.filter(
                element=hw_element,
                user=user
            ).first()

            has_submission = submission is not None
            submission_status = submission.status if submission else None

            # Включаем в расписание если:
            # 1. Нет ответа
            # 2. ИЛИ ответ требует доработки (revision_requested)
            if not has_submission or submission_status == HomeworkSubmission.Status.REVISION_REQUESTED:
                is_overdue = deadline_dt < now

                homework_items.append({
                    'item_type': 'homework',
                    'item_id': hw_element.id,
                    'section_id': section.id,
                    'section_title': section.title,
                    'element_title': hw_element.title or 'Домашнее задание',
                    'element_type': 'Форма для ДЗ',
                    'unlock_datetime': None,
                    'deadline': deadline_dt,
                    'is_overdue': is_overdue,
                    'has_submission': has_submission,
                    'submission_status': submission_status,
                })

    return homework_items


def _get_locked_content_for_course(course, user, now):
    """
    Получает заблокированные материалы для курса.

    Возвращает разделы и элементы с датами открытия в будущем.
    Добавляет информацию о курсе для использования в "Мое расписание".
    """
    locked_items = []

    # Получаем все разделы курса
    sections = course.sections.filter(is_published=True)

    for section in sections:
        # Если раздел заблокирован
        if section.publish_datetime and section.publish_datetime > now:
            locked_items.append({
                'item_type': 'section',
                'item_id': section.id,
                'course_id': course.id,
                'course_title': course.title,
                'section_id': section.id,
                'section_title': section.title,
                'element_title': None,
                'element_type': None,
                'unlock_datetime': section.publish_datetime,
                'deadline': None,
                'is_overdue': False,
                'has_submission': False,
                'submission_status': None,
            })

        # Получаем элементы раздела
        elements = section.elements.filter(is_published=True)

        for element in elements:
            # Если элемент заблокирован
            if element.publish_datetime and element.publish_datetime > now:
                locked_items.append({
                    'item_type': 'element',
                    'item_id': element.id,
                    'course_id': course.id,
                    'course_title': course.title,
                    'section_id': section.id,
                    'section_title': section.title,
                    'element_title': element.title or element.get_content_type_display(),
                    'element_type': element.get_content_type_display(),
                    'unlock_datetime': element.publish_datetime,
                    'deadline': None,
                    'is_overdue': False,
                    'has_submission': False,
                    'submission_status': None,
                })

    return locked_items


class CourseViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
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
        if self.action in ['list', 'retrieve', 'latest']:
            return [permissions.AllowAny()]
        if self.action == 'create':
            return [IsTeacher()]
        if self.action in ['subscribe', 'unsubscribe', 'my_courses', 'schedule']:
            return [permissions.IsAuthenticated()]
        if self.action in ['created_courses', 'drafts']:
            return [IsTeacher()]
        return [IsCourseOwnerOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=['post'])
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

    @action(detail=True, methods=['post'])
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

    @action(detail=False, methods=['get'])
    def created_courses(self, request):
        """Курсы, созданные текущим пользователем"""
        courses = Course.objects.filter(creator=request.user)
        serializer = CourseListSerializer(courses, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
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


    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """
        Возвращает расписание открытия материалов курса.
        Показывает только заблокированные элементы с датами открытия.

        Query params:
            include_homework (bool): Включить ДЗ с дедлайнами
        """
        course = self.get_object()
        user = request.user
        now = timezone.now()

        # Проверяем, что пользователь подписан на курс или является его владельцем
        is_subscribed = course.subscribers.filter(id=user.id).exists()
        is_owner = course.creator == user or user.is_admin or user.is_teacher

        if not (is_subscribed or is_owner):
            return Response(
                {'error': 'Вы должны быть подписаны на курс'},
                status=status.HTTP_403_FORBIDDEN
            )

        include_homework = request.query_params.get('include_homework', 'false').lower() == 'true'

        schedule_items = []

        # ЧАСТЬ 1: Получаем заблокированные материалы
        sections = course.sections.filter(is_published=True).select_related('course')

        for section in sections:
            # Если раздел заблокирован
            if section.publish_datetime and section.publish_datetime > now:
                # Для студентов - показываем в расписании
                # Для преподавателей - тоже показываем (они видят, что запланировано)
                schedule_items.append({
                    'item_type': 'section',
                    'item_id': section.id,
                    'section_id': section.id,
                    'section_title': section.title,
                    'element_title': None,
                    'element_type': None,
                    'unlock_datetime': section.publish_datetime,
                    'deadline': None,
                    'is_overdue': False,
                    'has_submission': False,
                    'submission_status': None,
                })

            # Получаем элементы раздела
            elements = section.elements.filter(is_published=True)

            for element in elements:
                # Если элемент заблокирован
                if element.publish_datetime and element.publish_datetime > now:
                    schedule_items.append({
                        'item_type': 'element',
                        'item_id': element.id,
                        'section_id': section.id,
                        'section_title': section.title,
                        'element_title': element.title or element.get_content_type_display(),
                        'element_type': element.get_content_type_display(),
                        'unlock_datetime': element.publish_datetime,
                        'deadline': None,
                        'is_overdue': False,
                        'has_submission': False,
                        'submission_status': None,
                    })

        # ЧАСТЬ 2: Добавляем домашние задания (если запрошено)
        # Админы/преподаватели тоже могут быть подписаны на курсы как студенты
        if include_homework:
            homework_items = _get_homework_schedule_for_course(course, user, now)
            schedule_items.extend(homework_items)

        # Сортируем по дате (unlock_datetime для материалов, deadline для ДЗ)
        schedule_items.sort(key=lambda x: x.get('unlock_datetime') or x.get('deadline') or now)

        serializer = CourseScheduleItemSerializer(schedule_items, many=True)
        return Response(serializer.data)


class SectionViewSet(viewsets.ModelViewSet):
    """ViewSet для управления разделами курса"""
    queryset = Section.objects.all()
    serializer_class = SectionSerializer

    def get_queryset(self):
        """
        Возвращает queryset с фильтрацией заблокированных разделов для студентов.

        Логика:
        - Админы и преподаватели видят все разделы
        - Студенты видят только разблокированные разделы
        - Владелец курса видит все разделы своего курса

        Фильтрация по query параметрам:
        - course: ID курса для фильтрации разделов
        """
        user = self.request.user
        now = timezone.now()

        # Базовый queryset с фильтрацией по курсу
        course_id = self.request.query_params.get('course')
        queryset = Section.objects.select_related('course').all()

        if course_id:
            queryset = queryset.filter(course_id=course_id)

        # Для неаутентифицированных пользователей - возвращаем пустой queryset
        if not user.is_authenticated:
            return queryset.none()

        # Админы и преподаватели видят все разделы
        if user.is_admin or user.is_teacher:
            return queryset

        # Для студентов фильтруем заблокированные разделы
        # Показываем только разделы, которые:
        # 1. Опубликованы (is_published=True)
        # 2. НЕ заблокированы по времени (publish_datetime <= now ИЛИ publish_datetime IS NULL)
        queryset = queryset.filter(is_published=True)
        queryset = queryset.filter(
            Q(publish_datetime__isnull=True) | Q(publish_datetime__lte=now)
        )

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return SectionListSerializer
        return SectionSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            # Для чтения разделов требуется подписка на курс
            return [IsCourseSubscriberOrAdmin()]
        return [IsCourseOwnerOrAdmin()]

    def retrieve(self, request, *args, **kwargs):
        """Получить детальную информацию о разделе с проверкой блокировки"""
        instance = self.get_object()
        user = request.user

        # Проверяем, заблокирован ли раздел для этого пользователя
        if instance.is_locked_for_user(user):
            return Response(
                {
                    'error': 'Раздел заблокирован',
                    'unlock_datetime': instance.publish_datetime,
                    'is_locked': True
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class ContentElementViewSet(viewsets.ModelViewSet):
    """ViewSet для управления элементами контента раздела"""
    queryset = ContentElement.objects.all()
    serializer_class = ContentElementSerializer

    def get_queryset(self):
        """
        Возвращает queryset с фильтрацией заблокированных элементов для студентов.

        Логика:
        - Админы и преподаватели видят все элементы
        - Студенты видят только разблокированные элементы доступных разделов
        - Владелец курса видит все элементы своего курса

        Фильтрация по query параметрам:
        - section: ID раздела для фильтрации элементов
        """
        user = self.request.user
        now = timezone.now()

        # Базовый queryset с оптимизацией
        section_id = self.request.query_params.get('section')
        queryset = ContentElement.objects.select_related('section', 'section__course').all()

        if section_id:
            queryset = queryset.filter(section_id=section_id)

        # Для неаутентифицированных пользователей - возвращаем пустой queryset
        if not user.is_authenticated:
            return queryset.none()

        # Админы и преподаватели видят все элементы
        if user.is_admin or user.is_teacher:
            return queryset

        # Для студентов фильтруем заблокированные элементы
        # Показываем только элементы, которые:
        # 1. Опубликованы (is_published=True)
        # 2. НЕ заблокированы по времени (publish_datetime <= now ИЛИ publish_datetime IS NULL)
        # 3. Принадлежат разблокированным разделам
        queryset = queryset.filter(is_published=True)
        queryset = queryset.filter(
            Q(publish_datetime__isnull=True) | Q(publish_datetime__lte=now)
        )

        # Фильтруем по разблокированным разделам
        queryset = queryset.filter(
            section__is_published=True
        ).filter(
            Q(section__publish_datetime__isnull=True) | Q(section__publish_datetime__lte=now)
        )

        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ContentElementDetailSerializer
        return ContentElementSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            # Для чтения элементов требуется подписка на курс
            return [IsCourseSubscriberOrAdmin()]
        if self.action == 'upload_image':
            return [IsCourseOwnerOrAdmin()]
        return [IsCourseOwnerOrAdmin()]

    def retrieve(self, request, *args, **kwargs):
        """Получить детальную информацию об элементе с проверкой блокировки"""
        instance = self.get_object()
        user = request.user

        # Проверяем, заблокирован ли элемент для этого пользователя
        if instance.is_locked_for_user(user):
            return Response(
                {
                    'error': 'Элемент заблокирован',
                    'unlock_datetime': instance.publish_datetime,
                    'is_locked': True
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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
        if self.action in ['list', 'retrieve', 'create', 'resubmit', 'review_history']:
            return [permissions.IsAuthenticated()]
        if self.action == 'review':
            return [IsTeacher(), IsCourseOwnerForHomework()]
        if self.action == 'section_stats':
            return [IsTeacher()]
        return [IsCourseOwnerOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """
        Проверить домашнее задание и оставить оценку с комментарием,
        либо вернуть на доработку без оценки.

        Request body:
            grade (int, optional): Оценка от 0 до 100
            teacher_comment (str, optional): Комментарий преподавателя
            request_revision (bool, optional): Вернуть на доработку без оценки

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

            # Определяем статус на основе параметра request_revision и наличия оценки
            request_revision = request.data.get('request_revision', False)
            if request_revision or grade is None:
                # Возврат на доработку без оценки
                submission.status = HomeworkSubmission.Status.REVISION_REQUESTED
                submission.grade = None
            else:
                # Обычная проверка с оценкой
                submission.status = HomeworkSubmission.Status.REVIEWED
                submission.grade = grade

            submission.teacher_comment = teacher_comment
            submission.reviewed_at = timezone.now()
            submission.save(update_fields=['status', 'grade', 'teacher_comment', 'reviewed_at'])

        # Возвращаем обновленный объект через сериализатор
        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def resubmit(self, request, pk=None):
        """
        Повторная отправка домашнего задания после возврата на доработку.

        Требования:
        - Пользователь должен быть владельцем submission
        - Статус submission должен быть REVISION_REQUESTED

        Request body (multipart/form-data):
            file (обязательно): новый файл
            comment (опционально): обновленный комментарий

        Returns:
            Обновленный объект HomeworkSubmission через сериализатор
        """
        submission = self.get_object()

        # Проверка прав: пользователь должен быть владельцем submission
        if submission.user != request.user:
            return Response(
                {'error': 'У вас нет прав на изменение этой работы'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Проверка статуса: можно переотправить только работы, требующие доработки
        if submission.status != HomeworkSubmission.Status.REVISION_REQUESTED:
            return Response(
                {'error': 'Можно переотправить только работы, требующие доработки'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Получаем новый файл (обязательно)
        new_file = request.FILES.get('file')
        if not new_file:
            return Response(
                {'error': 'Необходимо прикрепить файл'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Удаляем старый файл для экономии места
        if submission.file:
            submission.file.delete(save=False)

        # Обновляем submission
        submission.file = new_file
        submission.comment = request.data.get('comment', submission.comment)
        submission.status = HomeworkSubmission.Status.SUBMITTED
        submission.submitted_at = timezone.now()
        submission.reviewed_at = None  # Сбрасываем, будет установлено при новой проверке

        submission.save(update_fields=[
            'file', 'comment', 'status', 'submitted_at', 'reviewed_at'
        ])

        # Возвращаем обновленный объект через сериализатор
        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='section-stats')
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


class MyScheduleView(APIView):
    """
    Объединенное расписание пользователя по всем курсам.

    Возвращает:
    {
        "unlocks": [...],  # Запланированные открытия материалов
        "homeworks": [...]  # Домашние задания с дедлайнами
    }
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()

        # Получаем все курсы, на которые подписан пользователь
        subscribed_courses = Course.objects.filter(
            subscribers=user,
            is_published=True
        ).prefetch_related('sections', 'sections__elements')

        unlocks = []
        homeworks = []

        for course in subscribed_courses:
            # ЧАСТЬ 1: Собираем заблокированные материалы
            unlock_items = _get_locked_content_for_course(course, user, now)
            unlocks.extend(unlock_items)

            # ЧАСТЬ 2: Собираем ДЗ с дедлайнами
            homework_items = _get_homework_schedule_for_course(course, user, now)
            # Добавляем информацию о курсе
            for item in homework_items:
                item['course_id'] = course.id
                item['course_title'] = course.title
            homeworks.extend(homework_items)

        # Сортировка
        unlocks.sort(key=lambda x: x['unlock_datetime'])
        homeworks.sort(key=lambda x: (
            not x['is_overdue'],  # Просроченные в начале (False < True)
            x['deadline']
        ))

        from .serializers import CourseScheduleItemSerializer
        return Response({
            'unlocks': CourseScheduleItemSerializer(unlocks, many=True).data,
            'homeworks': CourseScheduleItemSerializer(homeworks, many=True).data,
        })
