from rest_framework import serializers
from .models import News, Tag


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

    class Meta:
        model = News
        fields = [
            'id', 'title', 'short_description', 'content', 'image', 'image_url',
            'tags', 'is_published', 'published_at', 'created_at', 'updated_at'
        ]


class NewsAdminSerializer(serializers.ModelSerializer):
    """Сериализатор для админки (создание/редактирование)"""
    tags = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        required=False
    )

    class Meta:
        model = News
        fields = [
            'id', 'title', 'short_description', 'content', 'image',
            'tags', 'is_published', 'published_at'
        ]
