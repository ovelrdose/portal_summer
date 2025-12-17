from django.urls import path
from . import views

urlpatterns = [
    path('users-by-grade/', views.users_by_grade, name='users-by-grade'),
    path('popular-courses/', views.popular_courses, name='popular-courses'),
    path('active-users/', views.active_users, name='active-users'),
    path('dashboard/', views.dashboard_stats, name='dashboard-stats'),
]
