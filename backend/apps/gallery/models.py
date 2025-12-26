from django.db import models
from django.conf import settings


class Album(models.Model):
    title = models.CharField('Название', max_length=255)
    description = models.TextField('Описание', blank=True)
    cover = models.ImageField(
        'Обложка',
        upload_to='gallery/covers/',
        blank=True,
        null=True
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_albums',
        verbose_name='Создатель',
        null=True,  # Временно для миграции
        blank=True
    )

    is_published = models.BooleanField('Опубликовано', default=False)
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)

    class Meta:
        verbose_name = 'Альбом'
        verbose_name_plural = 'Альбомы'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def photos_count(self):
        return self.photos.count()

    @property
    def cover_url(self):
        if self.cover:
            return self.cover.url
        first_photo = self.photos.first()
        if first_photo:
            return first_photo.image.url
        return None


class Photo(models.Model):
    album = models.ForeignKey(
        Album,
        on_delete=models.CASCADE,
        related_name='photos',
        verbose_name='Альбом'
    )
    title = models.CharField('Название', max_length=255, blank=True)
    image = models.ImageField('Изображение', upload_to='gallery/photos/')
    description = models.TextField('Описание', blank=True)

    order = models.PositiveIntegerField('Порядок', default=0)
    created_at = models.DateTimeField('Дата добавления', auto_now_add=True)

    class Meta:
        verbose_name = 'Фотография'
        verbose_name_plural = 'Фотографии'
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title or f'Фото #{self.id}'
