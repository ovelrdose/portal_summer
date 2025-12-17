from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('tags', views.TagViewSet)
router.register('', views.NewsViewSet, basename='news')

urlpatterns = [
    path('', include(router.urls)),
]
