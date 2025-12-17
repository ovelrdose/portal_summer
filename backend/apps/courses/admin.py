from django.contrib import admin
from .models import Course, Section, ContentElement, HomeworkSubmission, Subscription


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
    list_display = ['user', 'element', 'status', 'submitted_at', 'reviewed_at']
    list_filter = ['status', 'submitted_at']
    readonly_fields = ['submitted_at']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'subscribed_at']
    list_filter = ['course', 'subscribed_at']
