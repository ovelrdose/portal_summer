from rest_framework import serializers
from .models import Course, Section, ContentElement, HomeworkSubmission, Subscription
from apps.users.serializers import UserPublicSerializer


class HomeworkSubmissionSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)

    class Meta:
        model = HomeworkSubmission
        fields = [
            'id', 'element', 'user', 'file', 'comment',
            'status', 'teacher_comment', 'submitted_at', 'reviewed_at'
        ]
        read_only_fields = ['user', 'submitted_at', 'reviewed_at']


class ContentElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentElement
        fields = [
            'id', 'section', 'content_type', 'title', 'text_content',
            'image', 'link_url', 'link_text', 'homework_description',
            'order', 'is_published'
        ]


class ContentElementDetailSerializer(serializers.ModelSerializer):
    """Сериализатор с информацией о сданных ДЗ для текущего пользователя"""
    my_submission = serializers.SerializerMethodField()

    class Meta:
        model = ContentElement
        fields = [
            'id', 'section', 'content_type', 'title', 'text_content',
            'image', 'link_url', 'link_text', 'homework_description',
            'order', 'is_published', 'my_submission'
        ]

    def get_my_submission(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            submission = obj.submissions.filter(user=request.user).first()
            if submission:
                return HomeworkSubmissionSerializer(submission).data
        return None


class SectionSerializer(serializers.ModelSerializer):
    elements = ContentElementSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'course', 'title', 'order', 'is_published', 'elements']


class SectionListSerializer(serializers.ModelSerializer):
    """Для списка разделов без элементов"""
    elements_count = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ['id', 'course', 'title', 'order', 'is_published', 'elements_count']

    def get_elements_count(self, obj):
        return obj.elements.count()


class CourseListSerializer(serializers.ModelSerializer):
    """Сериализатор для карточек курсов"""
    creator = UserPublicSerializer(read_only=True)
    image_url = serializers.ReadOnlyField()
    subscribers_count = serializers.ReadOnlyField()
    is_subscribed = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'short_description', 'image', 'image_url',
            'creator', 'subscribers_count', 'is_subscribed', 'created_at'
        ]

    def get_is_subscribed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.subscribers.filter(id=request.user.id).exists()
        return False


class CourseDetailSerializer(serializers.ModelSerializer):
    """Детальный просмотр курса"""
    creator = UserPublicSerializer(read_only=True)
    sections = SectionSerializer(many=True, read_only=True)
    image_url = serializers.ReadOnlyField()
    subscribers_count = serializers.ReadOnlyField()
    is_subscribed = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'short_description', 'description', 'image', 'image_url',
            'creator', 'sections', 'subscribers_count', 'is_subscribed',
            'is_published', 'created_at', 'updated_at'
        ]

    def get_is_subscribed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.subscribers.filter(id=request.user.id).exists()
        return False


class CourseAdminSerializer(serializers.ModelSerializer):
    """Сериализатор для создания/редактирования курса"""

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'short_description', 'description',
            'image', 'is_published'
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = ['id', 'course', 'subscribed_at']
