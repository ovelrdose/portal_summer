from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Album, Photo
from .serializers import (
    AlbumListSerializer,
    AlbumDetailSerializer,
    AlbumAdminSerializer,
    PhotoSerializer
)
from apps.users.permissions import IsAdmin


class AlbumViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления альбомами.

    - Публичный доступ: list, retrieve, latest (только опубликованные)
    - Только админы: create, update, delete, publish, unpublish
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        """Админы видят все альбомы, пользователи - только опубликованные"""
        if self.request.user.is_authenticated and self.request.user.is_admin:
            return Album.objects.select_related('creator').prefetch_related('photos').all()
        return Album.objects.filter(is_published=True).select_related('creator').prefetch_related('photos')

    def get_serializer_class(self):
        """Выбор сериализатора в зависимости от действия"""
        if self.action == 'list':
            return AlbumListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return AlbumAdminSerializer
        return AlbumDetailSerializer

    def get_permissions(self):
        """Настройка прав доступа для разных действий"""
        if self.action in ['list', 'retrieve', 'latest']:
            return [permissions.AllowAny()]
        return [IsAdmin()]

    def perform_create(self, serializer):
        """Автоматически устанавливаем creator при создании альбома"""
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def publish(self, request, pk=None):
        """Публикация альбома"""
        album = self.get_object()
        album.is_published = True
        album.save()
        return Response({'status': 'Альбом опубликован'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def unpublish(self, request, pk=None):
        """Снятие альбома с публикации"""
        album = self.get_object()
        album.is_published = False
        album.save()
        return Response({'status': 'Альбом снят с публикации'})

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny()])
    def latest(self, request):
        """Последние опубликованные альбомы для главной страницы"""
        albums = self.get_queryset()[:6]
        serializer = AlbumListSerializer(albums, many=True)
        return Response(serializer.data)


class PhotoViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления фотографиями в альбомах.

    - Публичный доступ: list, retrieve
    - Только админы: create, update, delete, bulk_upload
    """
    serializer_class = PhotoSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        """Фильтрация фотографий по альбому"""
        album_id = self.request.query_params.get('album')
        queryset = Photo.objects.all()
        if album_id:
            queryset = queryset.filter(album_id=album_id)
        return queryset

    def get_permissions(self):
        """Настройка прав доступа для разных действий"""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdmin()]

    def destroy(self, request, *args, **kwargs):
        """
        Удаление фотографии.

        Физически удаляет файл и запись из БД.
        """
        instance = self.get_object()
        # Удаляем файл изображения
        if instance.image:
            instance.image.delete(save=False)
        # Удаляем запись из БД
        self.perform_destroy(instance)
        return Response(
            {'status': 'Фотография успешно удалена'},
            status=status.HTTP_204_NO_CONTENT
        )

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def bulk_upload(self, request):
        """
        Массовая загрузка фотографий в альбом.

        Валидирует размер каждого файла (не более 10 МБ).
        """
        album_id = request.data.get('album')
        files = request.FILES.getlist('images')

        if not album_id:
            return Response(
                {'error': 'Укажите ID альбома'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not files:
            return Response(
                {'error': 'Не загружено ни одного файла'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверяем существование альбома
        try:
            album = Album.objects.get(id=album_id)
        except Album.DoesNotExist:
            return Response(
                {'error': f'Альбом с ID {album_id} не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Валидация и создание фотографий
        errors = []
        photos = []
        max_file_size = 10 * 1024 * 1024  # 10MB

        for i, file in enumerate(files):
            # Проверка размера файла
            if file.size > max_file_size:
                errors.append({
                    'file': file.name,
                    'error': f'Файл слишком большой ({file.size / (1024*1024):.2f} МБ). Максимум: 10 МБ'
                })
                continue

            try:
                photo = Photo.objects.create(
                    album=album,
                    image=file,
                    title=file.name,  # Используем имя файла как заголовок
                    order=i
                )
                photos.append(photo)
            except Exception as e:
                errors.append({
                    'file': file.name,
                    'error': str(e)
                })

        # Формируем ответ
        response_data = {
            'uploaded': len(photos),
            'photos': PhotoSerializer(photos, many=True).data
        }

        if errors:
            response_data['errors'] = errors

        status_code = status.HTTP_201_CREATED if photos else status.HTTP_400_BAD_REQUEST
        return Response(response_data, status=status_code)
