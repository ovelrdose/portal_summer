from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

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

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdmin()]


class NewsViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tags', 'is_published']
    search_fields = ['title', 'short_description']
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
        if self.action in ['list', 'retrieve']:
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
        """Снятие с публикации"""
        news = self.get_object()
        news.is_published = False
        news.save()
        return Response({'status': 'Новость снята с публикации'})

    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Последние новости для главной страницы"""
        news = self.get_queryset()[:5]
        serializer = NewsListSerializer(news, many=True)
        return Response(serializer.data)
