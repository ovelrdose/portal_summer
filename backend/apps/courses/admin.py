from django.contrib import admin
from .models import Course, Section, ContentElement, HomeworkSubmission, HomeworkReviewHistory, Subscription


class SectionInline(admin.TabularInline):
    model = Section
    extra = 1
    fields = ['title', 'order', 'is_published']


class ContentElementInline(admin.TabularInline):
    model = ContentElement
    extra = 1
    fields = ['content_type', 'title', 'order', 'is_published']


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
    list_display = ['title', 'course', 'order', 'is_published']
    list_filter = ['course', 'is_published']
    list_editable = ['order']
    inlines = [ContentElementInline]


@admin.register(ContentElement)
class ContentElementAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'section', 'content_type', 'order', 'is_published']
    list_filter = ['content_type', 'section__course', 'is_published']
    list_editable = ['order']


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
