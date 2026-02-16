from django.urls import path
from . import views

urlpatterns = [
    # Legacy endpoints (для обратной совместимости)
    path('users-by-grade/', views.users_by_grade, name='users-by-grade'),
    path('popular-courses/', views.popular_courses, name='popular-courses'),
    path('active-users/', views.active_users, name='active-users'),
    path('dashboard/', views.dashboard_stats, name='dashboard-stats'),

    # Глобальная статистика (только администраторы)
    path('stats/global/', views.global_stats, name='global-stats'),
    path('stats/top-active-users/', views.top_active_users, name='top-active-users'),
    path('stats/top-active-users/export/', views.export_active_users_csv, name='export-active-users-csv'),
    path('stats/top-popular-courses/', views.top_popular_courses, name='top-popular-courses'),
    path('stats/users/', views.users_by_role, name='users-by-role'),
    path('stats/users/export/', views.export_users_csv, name='export-users-csv'),
    path('stats/users-by-grade/', views.users_by_grade_stats, name='users-by-grade-stats'),
    path('stats/users-by-grade/export/', views.export_users_by_grade_csv, name='export-users-by-grade-csv'),
    path('stats/users-geography/', views.users_geography_stats, name='users-geography-stats'),
    path('stats/users-geography/export/', views.export_users_geography_csv, name='export-users-geography-csv'),

    # Статистика курсов (администраторы и преподаватели)
    path('stats/courses/', views.courses_list_for_stats, name='courses-list-for-stats'),
    path('stats/courses/<int:course_id>/', views.course_stats, name='course-stats'),
    path('stats/courses/<int:course_id>/export/', views.export_course_stats_csv, name='export-course-stats-csv'),
]
