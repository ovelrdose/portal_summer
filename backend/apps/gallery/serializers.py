from rest_framework import serializers
from .models import Album, Photo


class PhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = ['id', 'album', 'title', 'image', 'description', 'order', 'created_at']


class AlbumListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка альбомов"""
    photos_count = serializers.ReadOnlyField()
    cover_url = serializers.ReadOnlyField()

    class Meta:
        model = Album
        fields = ['id', 'title', 'description', 'cover_url', 'photos_count', 'created_at']


class AlbumDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детального просмотра альбома с фотографиями"""
    photos = PhotoSerializer(many=True, read_only=True)
    photos_count = serializers.ReadOnlyField()

    class Meta:
        model = Album
        fields = [
            'id', 'title', 'description', 'cover', 'photos',
            'photos_count', 'is_published', 'created_at'
        ]


class AlbumAdminSerializer(serializers.ModelSerializer):
    """Сериализатор для админки"""

    class Meta:
        model = Album
        fields = ['id', 'title', 'description', 'cover', 'is_published']
