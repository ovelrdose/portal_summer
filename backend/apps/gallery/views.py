from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Album, Photo
from .serializers import (
    AlbumListSerializer,
    AlbumDetailSerializer,
    AlbumAdminSerializer,
    PhotoSerializer
)
from apps.users.permissions import IsAdmin


class AlbumViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_admin:
            return Album.objects.all()
        return Album.objects.filter(is_published=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return AlbumListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return AlbumAdminSerializer
        return AlbumDetailSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdmin()]

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def publish(self, request, pk=None):
        album = self.get_object()
        album.is_published = True
        album.save()
        return Response({'status': 'Альбом опубликован'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def unpublish(self, request, pk=None):
        album = self.get_object()
        album.is_published = False
        album.save()
        return Response({'status': 'Альбом снят с публикации'})

    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Последние альбомы для главной страницы"""
        albums = self.get_queryset()[:6]
        serializer = AlbumListSerializer(albums, many=True)
        return Response(serializer.data)


class PhotoViewSet(viewsets.ModelViewSet):
    serializer_class = PhotoSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        album_id = self.request.query_params.get('album')
        queryset = Photo.objects.all()
        if album_id:
            queryset = queryset.filter(album_id=album_id)
        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdmin()]

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def bulk_upload(self, request):
        """Массовая загрузка фотографий"""
        album_id = request.data.get('album')
        files = request.FILES.getlist('images')

        if not album_id or not files:
            return Response(
                {'error': 'Укажите альбом и файлы'},
                status=status.HTTP_400_BAD_REQUEST
            )

        photos = []
        for file in files:
            photo = Photo.objects.create(album_id=album_id, image=file)
            photos.append(photo)

        serializer = PhotoSerializer(photos, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
