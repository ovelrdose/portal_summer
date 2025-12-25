from rest_framework import serializers
from django.utils import timezone
from .models import News, Tag
from apps.courses.serializers import BlockDataValidator


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']


class NewsListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка новостей (карточки)"""
    tags = TagSerializer(many=True, read_only=True)
    image = serializers.SerializerMethodField()
    image_url = serializers.ReadOnlyField()

    class Meta:
        model = News
        fields = [
            'id', 'title', 'short_description', 'image', 'image_url',
            'tags', 'is_published', 'published_at'
        ]

    def get_image(self, obj):
        """Возвращает абсолютный URL изображения"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class NewsDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детального просмотра новости"""
    tags = TagSerializer(many=True, read_only=True)
    image_url = serializers.ReadOnlyField()
    uses_block_editor = serializers.ReadOnlyField()

    class Meta:
        model = News
        fields = [
            'id', 'title', 'short_description', 'content', 'content_blocks',
            'image', 'image_url', 'tags', 'is_published', 'published_at',
            'created_at', 'updated_at', 'uses_block_editor'
        ]


class NewsAdminSerializer(serializers.ModelSerializer):
    """Сериализатор для админки (создание/редактирование)"""
    tags = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        required=False
    )
    content = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    content_blocks = serializers.JSONField(required=False)

    class Meta:
        model = News
        fields = [
            'id', 'title', 'short_description', 'content', 'content_blocks',
            'image', 'tags', 'is_published', 'published_at'
        ]

    def validate_content_blocks(self, value):
        """Валидация блоков новостей"""
        # Если пришла JSON-строка (из FormData), парсим её
        if isinstance(value, str):
            import json
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("content_blocks должен быть валидным JSON")

        if not isinstance(value, list):
            raise serializers.ValidationError("content_blocks должен быть списком")

        for i, block in enumerate(value):
            if not isinstance(block, dict):
                raise serializers.ValidationError(f"Блок {i} должен быть объектом")

            block_type = block.get('type')
            if not block_type:
                raise serializers.ValidationError(f"Блок {i}: отсутствует поле 'type'")

            # Используем BlockDataValidator из курсов (исключаем homework)
            if block_type == 'homework':
                raise serializers.ValidationError("Тип 'homework' не поддерживается для новостей")

            data = block.get('data', {})
            try:
                BlockDataValidator.validate(block_type, data)
            except serializers.ValidationError as e:
                raise serializers.ValidationError(f"Блок {i} ({block_type}): {str(e)}")

        return value

    def create(self, validated_data: dict) -> News:
        """
        Создание новости с автоматической установкой published_at.

        Если новость создается с is_published=True, автоматически устанавливает
        published_at в текущее время.
        """
        tags_data = validated_data.pop('tags', [])

        # Устанавливаем published_at, если новость публикуется
        if validated_data.get('is_published', False) and not validated_data.get('published_at'):
            validated_data['published_at'] = timezone.now()

        news = News.objects.create(**validated_data)

        if tags_data:
            news.tags.set(tags_data)

        return news

    def update(self, instance: News, validated_data: dict) -> News:
        """
        Обновление новости с автоматической установкой published_at.

        Если is_published меняется с False на True, автоматически устанавливает
        published_at в текущее время.
        Если is_published меняется с True на False, обнуляет published_at.
        """
        tags_data = validated_data.pop('tags', None)

        # Проверяем, меняется ли статус публикации
        old_is_published = instance.is_published
        new_is_published = validated_data.get('is_published', old_is_published)

        # Если публикуем новость (False -> True), устанавливаем published_at
        if not old_is_published and new_is_published:
            if 'published_at' not in validated_data or validated_data['published_at'] is None:
                validated_data['published_at'] = timezone.now()

        # Если снимаем с публикации (True -> False), обнуляем published_at
        elif old_is_published and not new_is_published:
            validated_data['published_at'] = None

        # Обновляем поля новости
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # Обновляем теги, если они были переданы
        if tags_data is not None:
            instance.tags.set(tags_data)

        return instance
