from rest_framework import serializers
from .models import News, Tag
from apps.courses.serializers import BlockDataValidator


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']


class NewsListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка новостей (карточки)"""
    tags = TagSerializer(many=True, read_only=True)
    image_url = serializers.ReadOnlyField()

    class Meta:
        model = News
        fields = [
            'id', 'title', 'short_description', 'image', 'image_url',
            'tags', 'published_at'
        ]


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
