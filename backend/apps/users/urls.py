from django.urls import path
from . import views

urlpatterns = [
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('', views.UserListView.as_view(), name='user-list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('<int:pk>/delete/', views.delete_user, name='delete-user'),
    path('change-password/', views.change_password, name='change-password'),
    path('admin/reset-password/', views.admin_reset_password, name='admin-reset-password'),
    path('admin/assign-role/', views.assign_role, name='assign-role'),
]
