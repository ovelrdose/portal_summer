from rest_framework import serializers
from django.utils import timezone
import re
from .models import Course, Section, ContentElement, HomeworkSubmission, HomeworkReviewHistory, Subscription
from apps.users.serializers import UserPublicSerializer


class BlockDataValidator:
    """Валидатор JSON данных блока в зависимости от типа контента"""

    VIDEO_PATTERNS = {
        'youtube': re.compile(
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})'
        ),
        'vimeo': re.compile(
            r'vimeo\.com/(?:video/)?(\d+)'
        ),
    }

    @classmethod
    def validate(cls, content_type: str, data: dict) -> dict:
        """
        Валидирует данные блока согласно его типу.

        Args:
            content_type: Тип контента (text, video, image, link, homework)
            data: Словарь с данными блока

        Returns:
            Валидированный словарь данных

        Raises:
            serializers.ValidationError: При невалидных данных
        """
        if not isinstance(data, dict):
            raise serializers.ValidationError("Данные блока должны быть объектом")

        validators = {
            'text': cls._validate_text,
            'video': cls._validate_video,
            'image': cls._validate_image,
            'link': cls._validate_link,
            'homework': cls._validate_homework,
        }

        validator = validators.get(content_type)
        if not validator:
            raise serializers.ValidationError(f"Неизвестный тип контента: {content_type}")

        return validator(data)

    @classmethod
    def _validate_text(cls, data: dict) -> dict:
        """Валидация текстового блока"""
        if 'html' not in data:
            raise serializers.ValidationError("Поле 'html' обязательно для текстового блока")

        # html может быть пустой строкой
        if not isinstance(data['html'], str):
            raise serializers.ValidationError("Поле 'html' должно быть строкой")

        return data

    @classmethod
    def _validate_video(cls, data: dict) -> dict:
        """Валидация видео блока"""
        if 'url' not in data:
            raise serializers.ValidationError("Поле 'url' обязательно для видео блока")

        url = data['url']
        if not isinstance(url, str) or not url:
            raise serializers.ValidationError("URL видео должен быть непустой строкой")

        # Определяем провайдер и извлекаем video_id
        provider = None
        video_id = None

        for provider_name, pattern in cls.VIDEO_PATTERNS.items():
            match = pattern.search(url)
            if match:
                provider = provider_name
                video_id = match.group(1)
                break

        if not provider:
            raise serializers.ValidationError(
                "Поддерживаются только видео с YouTube и Vimeo"
            )

        # Добавляем извлеченные данные
        data['provider'] = provider
        data['video_id'] = video_id

        return data

    @classmethod
    def _validate_image(cls, data: dict) -> dict:
        """Валидация блока изображения"""
        if 'url' not in data:
            raise serializers.ValidationError("Поле 'url' обязательно для блока изображения")

        url = data['url']
        if not isinstance(url, str) or not url:
            raise serializers.ValidationError("URL изображения должен быть непустой строкой")

        return data

    @classmethod
    def _validate_link(cls, data: dict) -> dict:
        """Валидация блока ссылки"""
        if 'url' not in data:
            raise serializers.ValidationError("Поле 'url' обязательно для блока ссылки")

        url = data['url']
        if not isinstance(url, str) or not url:
            raise serializers.ValidationError("URL должен быть непустой строкой")

        # Проверяем, что URL начинается с http://, https:// или /
        if not (url.startswith('http://') or url.startswith('https://') or url.startswith('/')):
            raise serializers.ValidationError(
                "URL должен начинаться с http://, https:// или /"
            )

        return data

    @classmethod
    def _validate_homework(cls, data: dict) -> dict:
        """Валидация блока домашнего задания"""
        # deadline опционален, но если указан - не должен быть в прошлом
        deadline = data.get('deadline')
        if deadline:
            # deadline может быть строкой ISO или datetime объектом
            if isinstance(deadline, str):
                try:
                    from datetime import datetime
                    deadline_dt = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                    if deadline_dt < datetime.now(deadline_dt.tzinfo):
                        raise serializers.ValidationError(
                            "Дедлайн не может быть в прошлом"
                        )
                except ValueError:
                    raise serializers.ValidationError("Неверный формат даты для deadline")

        return data


class CourseBriefSerializer(serializers.ModelSerializer):
    """Краткая информация о курсе для вложенных структур"""

    class Meta:
        model = Course
        fields = ['id', 'title']
        read_only_fields = ['id', 'title']


class SectionBriefSerializer(serializers.ModelSerializer):
    """Краткая информация о разделе с курсом для вложенных структур"""
    course = CourseBriefSerializer(read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'title', 'course']
        read_only_fields = ['id', 'title', 'course']


class ContentElementBriefSerializer(serializers.ModelSerializer):
    """Краткая информация об элементе контента с разделом и курсом"""
    section = SectionBriefSerializer(read_only=True)

    class Meta:
        model = ContentElement
        fields = ['id', 'title', 'content_type', 'section']
        read_only_fields = ['id', 'title', 'content_type', 'section']


class HomeworkSubmissionSerializer(serializers.ModelSerializer):
    """
    Сериализатор для домашнего задания с вложенной структурой.

    При чтении возвращает полную информацию об элементе, разделе и курсе.
    При создании/обновлении принимает только ID элемента.
    """
    user = UserPublicSerializer(read_only=True)
    element = ContentElementBriefSerializer(read_only=True)
    element_id = serializers.PrimaryKeyRelatedField(
        queryset=ContentElement.objects.all(),
        source='element',
        write_only=True
    )

    class Meta:
        model = HomeworkSubmission
        fields = [
            'id', 'element', 'element_id', 'user', 'file', 'comment',
            'status', 'teacher_comment', 'grade', 'submitted_at', 'reviewed_at'
        ]
        read_only_fields = ['user', 'submitted_at', 'reviewed_at', 'element']

    def validate_grade(self, value):
        """Валидация оценки на уровне сериализатора"""
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError(
                "Оценка должна быть в диапазоне от 0 до 100"
            )
        return value


class HomeworkReviewHistorySerializer(serializers.ModelSerializer):
    """Сериализатор истории изменений оценок"""
    reviewer = UserPublicSerializer(read_only=True)
    submission_id = serializers.IntegerField(source='submission.id', read_only=True)

    class Meta:
        model = HomeworkReviewHistory
        fields = [
            'id', 'submission_id', 'reviewer', 'grade',
            'teacher_comment', 'reviewed_at'
        ]
        read_only_fields = ['id', 'reviewer', 'reviewed_at']


class ContentElementSerializer(serializers.ModelSerializer):
    """Сериализатор элемента контента с новым форматом данных"""

    class Meta:
        model = ContentElement
        fields = [
            'id', 'section', 'content_type', 'title', 'data',
            'order', 'is_published'
        ]

    def validate(self, attrs):
        """Валидируем данные блока согласно его типу"""
        content_type = attrs.get('content_type')
        data = attrs.get('data', {})

        if content_type and data:
            # Добавляем version и type если их нет
            if 'version' not in data:
                data['version'] = 1
            if 'type' not in data:
                data['type'] = content_type

            # Валидируем данные
            validated_data = BlockDataValidator.validate(content_type, data)
            attrs['data'] = validated_data

        return attrs


class ContentElementDetailSerializer(serializers.ModelSerializer):
    """Сериализатор с информацией о сданных ДЗ для текущего пользователя"""
    my_submission = serializers.SerializerMethodField()

    class Meta:
        model = ContentElement
        fields = [
            'id', 'section', 'content_type', 'title', 'data',
            'order', 'is_published', 'my_submission'
        ]

    def get_my_submission(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            submission = obj.submissions.filter(user=request.user).first()
            if submission:
                return HomeworkSubmissionSerializer(submission).data
        return None


class SectionSerializer(serializers.ModelSerializer):
    elements = ContentElementDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'course', 'title', 'order', 'is_published', 'elements']


class SectionListSerializer(serializers.ModelSerializer):
    """Для списка разделов без элементов"""
    elements_count = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ['id', 'course', 'title', 'order', 'is_published', 'elements_count']

    def get_elements_count(self, obj):
        return obj.elements.count()


class CourseListSerializer(serializers.ModelSerializer):
    """Сериализатор для карточек курсов"""
    creator = UserPublicSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    subscribers_count = serializers.ReadOnlyField()
    is_subscribed = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'short_description', 'image', 'image_url',
            'thumbnail', 'thumbnail_url',
            'creator', 'subscribers_count', 'is_subscribed', 'is_published', 'created_at'
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        # Возвращаем абсолютный URL для дефолтного изображения
        from django.conf import settings
        default_url = f'{settings.STATIC_URL}images/default-course.jpg'
        if request:
            return request.build_absolute_uri(default_url)
        return default_url

    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        # Приоритет: thumbnail → image → default
        if obj.thumbnail:
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        # Дефолтное изображение
        from django.conf import settings
        default_url = f'{settings.STATIC_URL}images/default-course.jpg'
        if request:
            return request.build_absolute_uri(default_url)
        return default_url

    def get_is_subscribed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.subscribers.filter(id=request.user.id).exists()
        return False


class CourseDetailSerializer(serializers.ModelSerializer):
    """Детальный просмотр курса"""
    creator = UserPublicSerializer(read_only=True)
    sections = SectionSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    subscribers_count = serializers.ReadOnlyField()
    is_subscribed = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'short_description', 'description', 'image', 'image_url',
            'thumbnail', 'thumbnail_url',
            'creator', 'sections', 'subscribers_count', 'is_subscribed',
            'is_published', 'created_at', 'updated_at'
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        # Возвращаем абсолютный URL для дефолтного изображения
        from django.conf import settings
        default_url = f'{settings.STATIC_URL}images/default-course.jpg'
        if request:
            return request.build_absolute_uri(default_url)
        return default_url

    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        # Приоритет: thumbnail → image → default
        if obj.thumbnail:
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        if obj.image:
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        # Дефолтное изображение
        from django.conf import settings
        default_url = f'{settings.STATIC_URL}images/default-course.jpg'
        if request:
            return request.build_absolute_uri(default_url)
        return default_url

    def get_is_subscribed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.subscribers.filter(id=request.user.id).exists()
        return False


class CourseAdminSerializer(serializers.ModelSerializer):
    """Сериализатор для создания/редактирования курса"""

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'short_description', 'description',
            'image', 'thumbnail', 'is_published'
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    course = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = ['id', 'course', 'subscribed_at']

    def get_course(self, obj):
        return CourseListSerializer(
            obj.course,
            context=self.context
        ).data
