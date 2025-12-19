from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django_ckeditor_5.fields import CKEditor5Field


class Course(models.Model):
    title = models.CharField('Название', max_length=255)
    short_description = models.TextField('Краткое описание', max_length=500)
    description = CKEditor5Field('Полное описание', config_name='default', blank=True)

    image = models.ImageField(
        'Изображение обложки',
        upload_to='courses/images/',
        blank=True,
        null=True,
        help_text='Рекомендуемый размер: 1200x400 px (3:1). Используется на странице курса'
    )

    thumbnail = models.ImageField(
        'Миниатюра (превью)',
        upload_to='courses/thumbnails/',
        blank=True,
        null=True,
        help_text='Рекомендуемый размер: 800x200 px (4:1). Используется в карточках курсов'
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_courses',
        verbose_name='Создатель'
    )

    subscribers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='Subscription',
        related_name='subscribed_courses',
        verbose_name='Подписчики'
    )

    is_published = models.BooleanField('Опубликовано', default=False)
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)

    class Meta:
        verbose_name = 'Курс'
        verbose_name_plural = 'Курсы'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def image_url(self):
        """Возвращает URL изображения курса или изображения по умолчанию"""
        if self.image:
            return self.image.url
        # Используем settings.STATIC_URL для правильного URL
        from django.conf import settings
        return f'{settings.STATIC_URL}images/default-course.jpg'

    @property
    def thumbnail_url(self):
        """Возвращает URL миниатюры или fallback на image или default"""
        if self.thumbnail:
            return self.thumbnail.url
        # Fallback: если нет thumbnail, используем image
        if self.image:
            return self.image.url
        # Финальный fallback: дефолтное изображение
        from django.conf import settings
        return f'{settings.STATIC_URL}images/default-course.jpg'

    @property
    def subscribers_count(self):
        return self.subscribers.count()


class Subscription(models.Model):
    """Подписка пользователя на курс"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name='Пользователь'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='subscriptions',
        verbose_name='Курс'
    )
    subscribed_at = models.DateTimeField('Дата подписки', auto_now_add=True)

    class Meta:
        verbose_name = 'Подписка'
        verbose_name_plural = 'Подписки'
        unique_together = ['user', 'course']

    def __str__(self):
        return f'{self.user} -> {self.course}'


class Section(models.Model):
    """Раздел курса"""
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='sections',
        verbose_name='Курс'
    )
    title = models.CharField('Название', max_length=255)
    order = models.PositiveIntegerField('Порядок', default=0)

    is_published = models.BooleanField('Опубликовано', default=True)
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)

    class Meta:
        verbose_name = 'Раздел'
        verbose_name_plural = 'Разделы'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f'{self.course.title} - {self.title}'


class ContentElement(models.Model):
    """Элемент контента раздела"""
    class ContentType(models.TextChoices):
        TEXT = 'text', 'Текст'
        IMAGE = 'image', 'Изображение'
        VIDEO = 'video', 'Видео'
        LINK = 'link', 'Ссылка'
        HOMEWORK = 'homework', 'Форма для ДЗ'

    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='elements',
        verbose_name='Раздел'
    )

    content_type = models.CharField(
        'Тип контента',
        max_length=20,
        choices=ContentType.choices
    )

    title = models.CharField('Заголовок', max_length=255, blank=True)

    # Текстовый контент (для типа TEXT)
    text_content = CKEditor5Field('Текст', config_name='default', blank=True)

    # Изображение (для типа IMAGE)
    image = models.ImageField(
        'Изображение',
        upload_to='courses/content/',
        blank=True,
        null=True
    )

    # Ссылка (для типа LINK)
    link_url = models.URLField('URL ссылки', blank=True)
    link_text = models.CharField('Текст ссылки', max_length=255, blank=True)

    # Для ДЗ (тип HOMEWORK) - описание задания
    homework_description = models.TextField('Описание задания', blank=True)

    # JSON данные блока (новый формат)
    data = models.JSONField('Данные блока', default=dict, blank=True)

    order = models.PositiveIntegerField('Порядок', default=0)
    is_published = models.BooleanField('Опубликовано', default=True)
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)

    class Meta:
        verbose_name = 'Элемент контента'
        verbose_name_plural = 'Элементы контента'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f'{self.section} - {self.get_content_type_display()}'


class HomeworkSubmission(models.Model):
    """Прикрепленное домашнее задание"""
    class Status(models.TextChoices):
        SUBMITTED = 'submitted', 'Отправлено'
        REVIEWED = 'reviewed', 'Проверено'

    element = models.ForeignKey(
        ContentElement,
        on_delete=models.CASCADE,
        related_name='submissions',
        verbose_name='Элемент ДЗ'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='homework_submissions',
        verbose_name='Пользователь'
    )

    file = models.FileField('Файл', upload_to='courses/homework/')
    comment = models.TextField('Комментарий', blank=True)

    status = models.CharField(
        'Статус',
        max_length=20,
        choices=Status.choices,
        default=Status.SUBMITTED
    )

    teacher_comment = CKEditor5Field(
        'Комментарий преподавателя',
        config_name='default',
        blank=True
    )

    grade = models.PositiveSmallIntegerField(
        'Оценка',
        null=True,
        blank=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100)
        ],
        help_text='Оценка от 0 до 100 баллов'
    )

    submitted_at = models.DateTimeField('Дата отправки', auto_now_add=True)
    reviewed_at = models.DateTimeField('Дата проверки', null=True, blank=True)

    class Meta:
        verbose_name = 'Домашнее задание'
        verbose_name_plural = 'Домашние задания'
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['element', 'status']),
        ]

    def __str__(self):
        return f'ДЗ от {self.user} - {self.element}'


class HomeworkReviewHistory(models.Model):
    """История изменений оценок домашних заданий"""
    submission = models.ForeignKey(
        HomeworkSubmission,
        on_delete=models.CASCADE,
        related_name='review_history',
        verbose_name='Домашнее задание'
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='homework_reviews',
        verbose_name='Преподаватель'
    )

    grade = models.PositiveSmallIntegerField(
        'Оценка',
        null=True,
        blank=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100)
        ]
    )

    teacher_comment = CKEditor5Field(
        'Комментарий',
        config_name='default',
        blank=True
    )

    reviewed_at = models.DateTimeField('Дата проверки', auto_now_add=True)

    class Meta:
        verbose_name = 'История проверки ДЗ'
        verbose_name_plural = 'История проверок ДЗ'
        ordering = ['-reviewed_at']

    def __str__(self):
        return f'Проверка {self.submission} от {self.reviewer} ({self.reviewed_at})'
