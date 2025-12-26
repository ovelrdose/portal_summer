from django.contrib import admin
from .models import Album, Photo


class PhotoInline(admin.TabularInline):
    model = Photo
    extra = 1
    fields = ['image', 'title', 'order']


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ['title', 'creator', 'photos_count', 'is_published', 'created_at']
    list_filter = ['is_published', 'created_at', 'creator']
    search_fields = ['title', 'description', 'creator__email', 'creator__first_name', 'creator__last_name']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [PhotoInline]

    def save_model(self, request, obj, form, change):
        """Автоматически устанавливаем creator при создании через админку"""
        if not change and not obj.creator:
            obj.creator = request.user
        super().save_model(request, obj, form, change)


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'album', 'order', 'created_at']
    list_filter = ['album', 'created_at']
    list_editable = ['order']
