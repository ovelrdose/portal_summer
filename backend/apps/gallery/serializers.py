from rest_framework import serializers
from .models import Album, Photo


class PhotoSerializer(serializers.ModelSerializer):
    """Сериализатор для фотографии"""

    class Meta:
        model = Photo
        fields = ['id', 'album', 'title', 'image', 'description', 'order', 'created_at']

    def validate_image(self, value):
        """Валидация размера файла изображения"""
        if value and value.size > 10 * 1024 * 1024:  # 10MB
            raise serializers.ValidationError(
                'Размер файла не должен превышать 10 МБ'
            )
        return value


class AlbumListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка альбомов"""
    photos_count = serializers.ReadOnlyField()
    cover_url = serializers.SerializerMethodField()
    creator_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Album
        fields = [
            'id', 'title', 'description', 'cover_url', 'photos_count',
            'creator_name', 'is_published', 'created_at'
        ]

    def get_cover_url(self, obj: Album):
        """Возвращает полный URL обложки альбома"""
        request = self.context.get('request')

        if obj.cover:
            if request:
                return request.build_absolute_uri(obj.cover.url)
            return obj.cover.url

        first_photo = obj.photos.first()
        if first_photo and first_photo.image:
            if request:
                return request.build_absolute_uri(first_photo.image.url)
            return first_photo.image.url

        return None

    def get_creator_name(self, obj: Album) -> str:
        """Возвращает полное имя создателя альбома"""
        if obj.creator:
            return obj.creator.get_full_name() or obj.creator.email
        return 'Неизвестно'


class AlbumDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детального просмотра альбома с фотографиями"""
    photos = PhotoSerializer(many=True, read_only=True)
    photos_count = serializers.ReadOnlyField()
    creator_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Album
        fields = [
            'id', 'title', 'description', 'cover', 'photos',
            'photos_count', 'creator_name', 'is_published', 'created_at'
        ]

    def get_creator_name(self, obj: Album) -> str:
        """Возвращает полное имя создателя альбома"""
        if obj.creator:
            return obj.creator.get_full_name() or obj.creator.email
        return 'Неизвестно'


class AlbumAdminSerializer(serializers.ModelSerializer):
    """Сериализатор для админки (создание/редактирование)"""

    class Meta:
        model = Album
        fields = ['id', 'title', 'description', 'cover', 'is_published']
