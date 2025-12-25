from django.db import models
from django_ckeditor_5.fields import CKEditor5Field


class Tag(models.Model):
    name = models.CharField('Название', max_length=100, unique=True)
    slug = models.SlugField('Slug', unique=True)

    class Meta:
        verbose_name = 'Тег'
        verbose_name_plural = 'Теги'
        ordering = ['name']

    def __str__(self):
        return self.name


class News(models.Model):
    title = models.CharField('Заголовок', max_length=255)
    short_description = models.TextField('Краткое описание', max_length=500)
    content = CKEditor5Field('Полное описание', config_name='default', blank=True, null=True)
    content_blocks = models.JSONField(
        'Блоки контента',
        default=list,
        blank=True,
        help_text='Структурированный контент в формате блоков'
    )

    image = models.ImageField(
        'Изображение',
        upload_to='news/images/',
        blank=True,
        null=True
    )

    tags = models.ManyToManyField(
        Tag,
        verbose_name='Теги',
        related_name='news',
        blank=True
    )

    is_published = models.BooleanField('Опубликовано', default=False)
    published_at = models.DateTimeField('Дата публикации', null=True, blank=True)

    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)

    class Meta:
        verbose_name = 'Новость'
        verbose_name_plural = 'Новости'
        ordering = ['-published_at', '-created_at']

    def __str__(self):
        return self.title

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return '/static/images/default-news.jpg'

    @property
    def uses_block_editor(self):
        """Проверяет, использует ли новость блочный редактор"""
        return bool(self.content_blocks)
