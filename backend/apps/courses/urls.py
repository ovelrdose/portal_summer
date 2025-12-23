from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Use a single router with all viewsets
router = DefaultRouter()
router.register(r'courses', views.CourseViewSet, basename='course')
router.register(r'sections', views.SectionViewSet, basename='section')
router.register(r'elements', views.ContentElementViewSet, basename='element')
router.register(r'homework', views.HomeworkSubmissionViewSet, basename='homework')

urlpatterns = [
    path('', include(router.urls)),
    path('my-schedule/', views.MyScheduleView.as_view(), name='my-schedule'),
]
