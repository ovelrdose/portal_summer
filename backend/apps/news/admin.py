from django.contrib import admin
from .models import News, Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_published', 'published_at', 'created_at']
    list_filter = ['is_published', 'tags', 'created_at']
    search_fields = ['title', 'short_description']
    filter_horizontal = ['tags']
    date_hierarchy = 'created_at'

    fieldsets = (
        (None, {'fields': ('title', 'short_description', 'content')}),
        ('Медиа', {'fields': ('image',)}),
        ('Категоризация', {'fields': ('tags',)}),
        ('Публикация', {'fields': ('is_published', 'published_at')}),
    )
