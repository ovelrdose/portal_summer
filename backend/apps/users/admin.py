from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'full_name', 'role', 'grade', 'is_active', 'created_at']
    list_filter = ['role', 'grade', 'is_active', 'created_at']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-created_at']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Персональные данные', {'fields': (
            'first_name', 'last_name', 'patronymic', 'photo'
        )}),
        ('Дополнительно', {'fields': ('grade', 'country', 'city', 'role')}),
        ('Права доступа', {'fields': (
            'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'
        )}),
        ('Даты', {'fields': ('last_login', 'created_at')}),
    )

    readonly_fields = ['created_at', 'last_login']

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'password1', 'password2',
                'first_name', 'last_name', 'role'
            ),
        }),
    )
