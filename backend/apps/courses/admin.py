from django.contrib import admin
from .models import Course, Section, ContentElement, HomeworkSubmission, HomeworkReviewHistory, Subscription


class SectionInline(admin.TabularInline):
    model = Section
    extra = 1
    fields = ['title', 'order', 'is_published', 'publish_datetime']


class ContentElementInline(admin.TabularInline):
    model = ContentElement
    extra = 1
    fields = ['content_type', 'title', 'order', 'is_published', 'publish_datetime']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'creator', 'subscribers_count', 'is_published', 'created_at']
    list_filter = ['is_published', 'creator', 'created_at']
    search_fields = ['title', 'short_description']
    inlines = [SectionInline]

    def subscribers_count(self, obj):
        return obj.subscribers.count()
    subscribers_count.short_description = 'Подписчиков'


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order', 'is_published', 'publish_datetime']
    list_filter = ['course', 'is_published', 'publish_datetime']
    list_editable = ['order']
    inlines = [ContentElementInline]
    fieldsets = [
        (None, {
            'fields': ['course', 'title', 'order']
        }),
        ('Публикация', {
            'fields': ['is_published', 'publish_datetime'],
            'description': 'Если указана дата публикации, раздел будет заблокирован до этого времени'
        }),
    ]


@admin.register(ContentElement)
class ContentElementAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'section', 'content_type', 'order', 'is_published', 'publish_datetime']
    list_filter = ['content_type', 'section__course', 'is_published', 'publish_datetime']
    list_editable = ['order']
    fieldsets = [
        (None, {
            'fields': ['section', 'content_type', 'title', 'order']
        }),
        ('Контент', {
            'fields': ['text_content', 'image', 'link_url', 'link_text', 'homework_description', 'data']
        }),
        ('Публикация', {
            'fields': ['is_published', 'publish_datetime'],
            'description': 'Если указана дата публикации, элемент будет заблокирован до этого времени'
        }),
    ]


@admin.register(HomeworkSubmission)
class HomeworkSubmissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'element', 'status', 'grade', 'submitted_at', 'reviewed_at']
    list_filter = ['status', 'submitted_at', ('grade', admin.EmptyFieldListFilter)]
    readonly_fields = ['submitted_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']


@admin.register(HomeworkReviewHistory)
class HomeworkReviewHistoryAdmin(admin.ModelAdmin):
    list_display = ['submission', 'reviewer', 'grade', 'reviewed_at']
    list_filter = ['reviewed_at', 'reviewer']
    readonly_fields = ['submission', 'reviewer', 'reviewed_at']
    search_fields = ['submission__user__email', 'submission__user__first_name', 'submission__user__last_name', 'reviewer__email']

    def has_add_permission(self, request):
        # Запретить ручное добавление записей истории (они создаются автоматически)
        return False


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'subscribed_at']
    list_filter = ['course', 'subscribed_at']
