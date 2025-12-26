# Gallery Module Improvements

## Обзор изменений

Модуль `apps/gallery` был улучшен в соответствии с архитектурными паттернами из модулей `apps/news` и `apps/courses`.

## Изменения в моделях (`models.py`)

### Album
**Добавлено:**
- Поле `creator` (ForeignKey на User) - отслеживание автора альбома
  - `on_delete=CASCADE` - при удалении пользователя удаляются его альбомы
  - `related_name='created_albums'` - для обратной связи с User
  - `null=True, blank=True` - для совместимости с существующими данными

**Импорты:**
- Добавлен `from django.conf import settings`

## Изменения в сериализаторах (`serializers.py`)

### PhotoSerializer
**Добавлено:**
- Метод `validate_image()` - валидация размера файла (макс. 10 МБ)
- Docstring для документации

### AlbumListSerializer
**Добавлено:**
- Поле `creator_name` (SerializerMethodField, read-only)
- Метод `get_creator_name()` - возвращает полное имя создателя или email

### AlbumDetailSerializer
**Добавлено:**
- Поле `creator_name` (SerializerMethodField, read-only)
- Метод `get_creator_name()` - возвращает полное имя создателя или email

## Изменения во views (`views.py`)

### AlbumViewSet
**Улучшено:**
- Добавлены подробные docstrings для класса и всех методов
- `get_queryset()` - оптимизация с использованием `select_related('creator')`
- `perform_create()` - автоматическая установка `creator=request.user`

### PhotoViewSet
**Добавлено:**
- Метод `destroy()` - удаление фотографии с физическим удалением файла
- Улучшенная валидация в `bulk_upload()`:
  - Проверка размера каждого файла (макс. 10 МБ)
  - Проверка существования альбома
  - Детальные сообщения об ошибках для каждого файла
  - Автоматическая установка `title` из имени файла
  - Автоматическая установка `order` по индексу

**Улучшено:**
- Добавлены подробные docstrings для класса и всех методов
- Улучшенная обработка ошибок с информативными сообщениями

## Изменения в админке (`admin.py`)

### AlbumAdmin
**Добавлено:**
- `'creator'` в `list_display` - отображение автора в списке
- `'creator'` в `list_filter` - фильтрация по создателю
- Поиск по полям создателя: `creator__email`, `creator__first_name`, `creator__last_name`
- `readonly_fields` - `created_at`, `updated_at`
- Метод `save_model()` - автоматическая установка `creator=request.user` при создании через админку

## Миграции

### 0002_album_creator.py
Создана миграция для добавления поля `creator` в модель `Album`.

**Команды для применения:**
```bash
python manage.py migrate gallery
```

**Статус миграции:**
```
gallery
 [X] 0001_initial
 [X] 0002_album_creator
```

## Безопасность

### Валидация файлов
- Размер файла изображения: не более 10 МБ (PhotoSerializer.validate_image)
- Размер файла при массовой загрузке: не более 10 МБ (PhotoViewSet.bulk_upload)

### Права доступа
- **AlbumViewSet:**
  - Публичный доступ: `list`, `retrieve`, `latest` (только опубликованные)
  - Только админы: `create`, `update`, `delete`, `publish`, `unpublish`

- **PhotoViewSet:**
  - Публичный доступ: `list`, `retrieve`
  - Только админы: `create`, `update`, `delete`, `bulk_upload`

## Производительность

### Оптимизация запросов
- `Album.objects.select_related('creator')` - избегание N+1 запросов при получении информации о создателе

## API Endpoints

### Albums
- `GET /api/gallery/albums/` - Список опубликованных альбомов (для всех)
- `GET /api/gallery/albums/{id}/` - Детальная информация об альбоме
- `POST /api/gallery/albums/` - Создание альбома (только админы)
- `PUT/PATCH /api/gallery/albums/{id}/` - Редактирование альбома (только админы)
- `DELETE /api/gallery/albums/{id}/` - Удаление альбома (только админы)
- `POST /api/gallery/albums/{id}/publish/` - Публикация альбома (только админы)
- `POST /api/gallery/albums/{id}/unpublish/` - Снятие с публикации (только админы)
- `GET /api/gallery/albums/latest/` - Последние 6 опубликованных альбомов

### Photos
- `GET /api/gallery/photos/` - Список фотографий (опционально фильтр `?album=ID`)
- `GET /api/gallery/photos/{id}/` - Детальная информация о фотографии
- `POST /api/gallery/photos/` - Добавление фотографии (только админы)
- `PUT/PATCH /api/gallery/photos/{id}/` - Редактирование фотографии (только админы)
- `DELETE /api/gallery/photos/{id}/` - Удаление фотографии (только админы)
- `POST /api/gallery/photos/bulk_upload/` - Массовая загрузка фотографий (только админы)

## Тестовые сценарии

### 1. Создание альбома (API)
**Предусловия:** Авторизован как админ

**Запрос:**
```http
POST /api/gallery/albums/
Content-Type: multipart/form-data

{
  "title": "Летний лагерь 2025",
  "description": "Фотографии из летнего лагеря",
  "cover": <file>,
  "is_published": false
}
```

**Ожидаемый результат:**
- Альбом создан с `creator` = текущий пользователь
- Возвращен статус 201 Created

### 2. Список альбомов с информацией о создателе
**Запрос:**
```http
GET /api/gallery/albums/
```

**Ожидаемый результат:**
```json
[
  {
    "id": 1,
    "title": "Летний лагерь 2025",
    "description": "Фотографии из летнего лагеря",
    "cover_url": "/media/gallery/covers/...",
    "photos_count": 12,
    "creator_name": "Иван Иванов",
    "is_published": true,
    "created_at": "2025-12-26T12:00:00Z"
  }
]
```

### 3. Массовая загрузка фотографий с валидацией
**Предусловия:** Авторизован как админ

**Запрос:**
```http
POST /api/gallery/photos/bulk_upload/
Content-Type: multipart/form-data

{
  "album": 1,
  "images": [<file1>, <file2>, <file3>]
}
```

**Ожидаемый результат:**
- Файлы меньше 10 МБ загружены успешно
- Файлы больше 10 МБ отклонены с сообщением об ошибке
- Возвращен JSON с количеством загруженных файлов и списком ошибок

**Пример ответа:**
```json
{
  "uploaded": 2,
  "photos": [
    {
      "id": 1,
      "album": 1,
      "title": "photo1.jpg",
      "image": "/media/gallery/photos/photo1.jpg",
      "order": 0,
      "created_at": "2025-12-26T12:00:00Z"
    },
    {
      "id": 2,
      "album": 1,
      "title": "photo2.jpg",
      "image": "/media/gallery/photos/photo2.jpg",
      "order": 1,
      "created_at": "2025-12-26T12:00:01Z"
    }
  ],
  "errors": [
    {
      "file": "large_photo.jpg",
      "error": "Файл слишком большой (15.23 МБ). Максимум: 10 МБ"
    }
  ]
}
```

### 4. Удаление фотографии
**Предусловия:** Авторизован как админ

**Запрос:**
```http
DELETE /api/gallery/photos/5/
```

**Ожидаемый результат:**
- Фотография удалена из БД
- Файл изображения удален с диска
- Возвращен статус 204 No Content

### 5. Публикация/снятие альбома с публикации
**Предусловия:** Авторизован как админ

**Запрос (публикация):**
```http
POST /api/gallery/albums/1/publish/
```

**Ожидаемый результат:**
```json
{
  "status": "Альбом опубликован"
}
```

**Запрос (снятие с публикации):**
```http
POST /api/gallery/albums/1/unpublish/
```

**Ожидаемый результат:**
```json
{
  "status": "Альбом снят с публикации"
}
```

### 6. Создание альбома через Django Admin
**Предусловия:** Авторизован в админке как админ

**Действия:**
1. Перейти в `/admin/gallery/album/add/`
2. Заполнить форму (title, description, cover)
3. Сохранить

**Ожидаемый результат:**
- Альбом создан с `creator` = текущий пользователь (автоматически)
- В списке альбомов отображается создатель

### 7. Валидация размера файла при создании фотографии
**Предусловия:** Авторизован как админ

**Запрос:**
```http
POST /api/gallery/photos/
Content-Type: multipart/form-data

{
  "album": 1,
  "title": "Большое фото",
  "image": <file_size_15MB>
}
```

**Ожидаемый результат:**
- Возвращен статус 400 Bad Request
- Сообщение об ошибке: "Размер файла не должен превышать 10 МБ"

## Потенциальные риски

1. **Существующие данные:** Для существующих альбомов поле `creator` будет `NULL`. Рекомендуется создать data migration для установки значения по умолчанию (например, первый админ в системе).

2. **Cascade удаление:** При удалении пользователя удаляются все его альбомы. Если это нежелательное поведение, можно изменить `on_delete=SET_NULL` и сделать поле `creator` nullable.

## Альтернативные решения

1. **Использование `on_delete=SET_NULL`** вместо `CASCADE` для предотвращения удаления альбомов при удалении пользователя.

2. **Добавление поля `creator` также в модель `Photo`** для отслеживания, кто загрузил каждую фотографию.

3. **Добавление permissions для редактирования своих альбомов** (не только админами, но и владельцами).

## Следующие шаги

1. Создать data migration для установки `creator` для существующих альбомов
2. Добавить тесты для новой функциональности
3. Обновить frontend для отображения информации о создателе
4. Добавить возможность фильтрации альбомов по создателю в API
