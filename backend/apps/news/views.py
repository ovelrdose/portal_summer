from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.core.files.storage import default_storage
import os

from .models import News, Tag
from .serializers import (
    NewsListSerializer,
    NewsDetailSerializer,
    NewsAdminSerializer,
    TagSerializer
)
from apps.users.permissions import IsAdmin


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    pagination_class = None  # Отключаем пагинацию для тегов

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdmin()]


class NewsViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tags', 'is_published']
    search_fields = ['title', 'short_description', 'tags__name']
    ordering_fields = ['published_at', 'created_at']

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_admin:
            return News.objects.all()
        return News.objects.filter(is_published=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return NewsListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return NewsAdminSerializer
        return NewsDetailSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'latest']:
            return [permissions.AllowAny()]
        return [IsAdmin()]

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def publish(self, request, pk=None):
        """Публикация новости"""
        news = self.get_object()
        news.is_published = True
        news.published_at = timezone.now()
        news.save()
        return Response({'status': 'Новость опубликована'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def unpublish(self, request, pk=None):
        """Вернуть новость в черновик"""
        news = self.get_object()
        news.is_published = False
        news.published_at = None
        news.save()
        return Response({'status': 'Новость возвращена в черновик'})

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny()])
    def latest(self, request):
        """Последние новости для главной страницы"""
        news = self.get_queryset().filter(is_published=True)[:5]
        serializer = NewsListSerializer(news, many=True, context={'request': request})
        return Response(serializer.data)

    @action(
        detail=False,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[IsAdmin]
    )
    def upload_image(self, request):
        """
        Загружает изображение для использования в блоках контента новостей.

        Валидация:
        - Допустимые типы: jpeg, jpg, png, gif, webp
        - Максимальный размер: 5 МБ

        Returns:
            {"url": "/media/news/content/image.jpg", "filename": "image.jpg"}
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

        # Сохраняем файл в директорию news/content/
        file_path = os.path.join('news/content/', image_file.name)
        saved_path = default_storage.save(file_path, image_file)
        file_url = default_storage.url(saved_path)

        # Формируем полный URL для фронтенда
        if not file_url.startswith('http'):
            # Получаем базовый URL из request
            base_url = request.build_absolute_uri('/')[:-1]  # удаляем последний /
            file_url = base_url + file_url

        return Response({
            'url': file_url,
            'filename': image_file.name
        }, status=status.HTTP_201_CREATED)
