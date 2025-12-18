# Block Editor Backend API

Документация по реализованному блочному редактору для Django Backend.

## Реализованные изменения

### 1. Модель ContentElement

**Файл:** `backend/apps/courses/models.py`

**Изменения:**
- Добавлен новый тип контента: `VIDEO = 'video', 'Видео'`
- Добавлено поле `data = models.JSONField('Данные блока', default=dict, blank=True)`
- Старые поля (text_content, image, link_url, link_text, homework_description) сохранены для обратной совместимости

### 2. Миграции

**Файл:** `backend/apps/courses/migrations/0004_contentelement_data_and_more.py`

**Функциональность:**
- Создано поле `data` типа JSONField
- Data migration для автоматического переноса данных из старых полей в JSON формат
- Обратная миграция для возврата данных в старые поля (при откате)

**Формат данных после миграции:**

```python
# TEXT блок
{
    "version": 1,
    "type": "text",
    "html": "<p>Текстовое содержимое</p>"
}

# IMAGE блок
{
    "version": 1,
    "type": "image",
    "url": "/media/courses/content/image.jpg",
    "alt": "Описание изображения",
    "caption": ""
}

# VIDEO блок
{
    "version": 1,
    "type": "video",
    "url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "provider": "youtube",
    "video_id": "VIDEO_ID"
}

# LINK блок
{
    "version": 1,
    "type": "link",
    "url": "https://example.com",
    "text": "Текст ссылки",
    "open_in_new_tab": true
}

# HOMEWORK блок
{
    "version": 1,
    "type": "homework",
    "description": "Описание домашнего задания",
    "deadline": null,  # или ISO формат даты
    "max_file_size_mb": 10,
    "allowed_extensions": ["pdf", "docx", "zip"]
}
```

### 3. Валидатор BlockDataValidator

**Файл:** `backend/apps/courses/serializers.py`

**Класс:** `BlockDataValidator`

**Функции валидации:**

#### TEXT блок
- Поле `html` обязательно (может быть пустой строкой)
- Тип: строка

#### VIDEO блок
- Поле `url` обязательно
- Поддерживаются только YouTube и Vimeo
- Автоматическое извлечение `provider` и `video_id` из URL
- Поддерживаемые форматы URL:
  - YouTube: `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`
  - Vimeo: `vimeo.com/ID`, `vimeo.com/video/ID`

#### IMAGE блок
- Поле `url` обязательно
- Тип: непустая строка

#### LINK блок
- Поле `url` обязательно
- URL должен начинаться с `http://`, `https://` или `/`

#### HOMEWORK блок
- Поле `deadline` опционально
- Если `deadline` указан, он не должен быть в прошлом
- Формат deadline: ISO 8601 строка

### 4. Сериализаторы

**Файл:** `backend/apps/courses/serializers.py`

#### ContentElementSerializer
- Использует новое поле `data` вместо старых полей
- Автоматическая валидация данных через `BlockDataValidator`
- Автоматическое добавление `version` и `type` если они отсутствуют

**Поля:**
```python
fields = [
    'id',
    'section',
    'content_type',
    'title',
    'data',
    'order',
    'is_published'
]
```

#### ContentElementDetailSerializer
- Наследуется от `ContentElementSerializer`
- Добавляет поле `my_submission` для блоков типа HOMEWORK
- Показывает информацию о сданном ДЗ текущего пользователя

### 5. API Endpoints

**Файл:** `backend/apps/courses/views.py`

#### Upload Image
**Endpoint:** `POST /api/content-elements/upload_image/`

**Назначение:** Загрузка изображений для использования в блоках

**Права доступа:** Владелец курса или Admin

**Параметры:**
- `image` (file, required) - файл изображения

**Валидация:**
- Допустимые форматы: jpg, jpeg, png, gif, webp
- Максимальный размер: 5 МБ

**Ответ:**
```json
{
    "url": "/media/courses/content/image.jpg",
    "filename": "image.jpg"
}
```

**Пример использования (curl):**
```bash
curl -X POST \
  http://localhost:8000/api/content-elements/upload_image/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

#### Reorder Elements
**Endpoint:** `POST /api/content-elements/reorder/`

**Назначение:** Массовое обновление порядка элементов контента

**Права доступа:** Владелец курса или Admin

**Параметры:**
```json
{
    "items": [
        {"id": 1, "order": 0},
        {"id": 2, "order": 1},
        {"id": 3, "order": 2}
    ]
}
```

**Ответ:**
```json
{
    "status": "Порядок элементов обновлен",
    "updated": 3
}
```

**Особенности:**
- Используется транзакция для атомарности операции
- Проверка прав доступа для каждого элемента
- При ошибке откатываются все изменения

**Пример использования (JavaScript):**
```javascript
const response = await fetch('/api/content-elements/reorder/', {
    method: 'POST',
    headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        items: [
            {id: 5, order: 0},
            {id: 3, order: 1},
            {id: 7, order: 2}
        ]
    })
});

const data = await response.json();
console.log(data.status);
```

## Примеры использования API

### Создание TEXT блока

```bash
curl -X POST \
  http://localhost:8000/api/content-elements/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": 1,
    "content_type": "text",
    "title": "Введение",
    "data": {
        "html": "<h2>Добро пожаловать!</h2><p>Это вводный урок.</p>"
    },
    "order": 0,
    "is_published": true
  }'
```

### Создание VIDEO блока

```bash
curl -X POST \
  http://localhost:8000/api/content-elements/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": 1,
    "content_type": "video",
    "title": "Обучающее видео",
    "data": {
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    "order": 1,
    "is_published": true
  }'
```

**Ответ (автоматически добавятся provider и video_id):**
```json
{
    "id": 10,
    "section": 1,
    "content_type": "video",
    "title": "Обучающее видео",
    "data": {
        "version": 1,
        "type": "video",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "provider": "youtube",
        "video_id": "dQw4w9WgXcQ"
    },
    "order": 1,
    "is_published": true
}
```

### Создание IMAGE блока

```bash
# 1. Сначала загружаем изображение
curl -X POST \
  http://localhost:8000/api/content-elements/upload_image/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "image=@diagram.png"

# Ответ: {"url": "/media/courses/content/diagram.png", "filename": "diagram.png"}

# 2. Создаем блок с полученным URL
curl -X POST \
  http://localhost:8000/api/content-elements/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": 1,
    "content_type": "image",
    "title": "Диаграмма архитектуры",
    "data": {
        "url": "/media/courses/content/diagram.png",
        "alt": "Диаграмма архитектуры системы",
        "caption": "Рисунок 1. Общая архитектура"
    },
    "order": 2,
    "is_published": true
  }'
```

### Создание LINK блока

```bash
curl -X POST \
  http://localhost:8000/api/content-elements/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": 1,
    "content_type": "link",
    "title": "Дополнительные материалы",
    "data": {
        "url": "https://docs.djangoproject.com/",
        "text": "Официальная документация Django",
        "open_in_new_tab": true
    },
    "order": 3,
    "is_published": true
  }'
```

### Создание HOMEWORK блока

```bash
curl -X POST \
  http://localhost:8000/api/content-elements/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": 1,
    "content_type": "homework",
    "title": "Домашнее задание #1",
    "data": {
        "description": "Создайте Django проект с кастомной моделью User",
        "deadline": "2025-12-25T23:59:59Z",
        "max_file_size_mb": 15,
        "allowed_extensions": ["zip", "tar.gz"]
    },
    "order": 4,
    "is_published": true
  }'
```

## Безопасность

### Реализованные проверки

1. **Валидация входных данных**
   - Проверка типов файлов при загрузке изображений
   - Ограничение размера файлов (5 МБ для изображений)
   - Валидация JSON структуры для каждого типа блока
   - Проверка URL на допустимые протоколы

2. **Права доступа**
   - Только владелец курса или админ может создавать/редактировать элементы
   - Проверка прав при массовом изменении порядка элементов
   - Проверка прав для каждого элемента в транзакции

3. **Защита от XSS**
   - HTML контент должен фильтроваться на фронтенде перед отображением
   - Рекомендуется использовать библиотеки типа DOMPurify

4. **Защита от SQL Injection**
   - Используются параметризованные запросы ORM
   - Нет raw SQL запросов

## Тестирование

### Ключевые сценарии для тестирования

1. **Миграция данных**
   - Проверить, что существующие элементы корректно мигрированы в JSON формат
   - Проверить обратную миграцию

2. **Валидация блоков**
   - Создание каждого типа блока с валидными данными
   - Попытка создания блоков с невалидными данными (должны быть ошибки)
   - Проверка автоматического извлечения provider/video_id для видео

3. **Загрузка изображений**
   - Загрузка валидного изображения
   - Попытка загрузить файл неверного типа
   - Попытка загрузить файл размером > 5 МБ

4. **Изменение порядка**
   - Массовое изменение порядка элементов
   - Попытка изменить порядок элементов чужого курса (должна быть ошибка)
   - Проверка атомарности транзакции

5. **Права доступа**
   - Доступ для владельца курса
   - Доступ для админа
   - Отказ в доступе для обычного пользователя
   - Отказ в доступе для неаутентифицированного пользователя

## Примечания и рекомендации

### Обратная совместимость
- Старые поля (text_content, image, link_url и т.д.) сохранены в модели
- При необходимости можно вернуться к старому формату через обратную миграцию
- Рекомендуется обновить фронтенд для использования нового API

### Производительность
- При загрузке списка элементов используется select_related('section__course') для оптимизации
- Транзакции используются для атомарности операций массового обновления
- JSONField индексируется PostgreSQL, что обеспечивает быстрый доступ

### Расширяемость
- Версионирование данных (`version: 1`) позволяет в будущем изменять структуру
- Легко добавить новые типы блоков, расширив ContentType choices и BlockDataValidator
- Валидация вынесена в отдельный класс для переиспользования

### Следующие шаги
1. Обновить фронтенд для работы с новым форматом данных
2. Реализовать rich text редактор для TEXT блоков
3. Добавить предпросмотр для VIDEO блоков
4. Реализовать drag-and-drop для изменения порядка элементов
5. Добавить bulk operations (массовое удаление, копирование)

## Команды для применения изменений

```bash
# Переход в директорию backend
cd backend

# Создание миграций (уже выполнено)
python manage.py makemigrations courses

# Применение миграций (уже выполнено)
python manage.py migrate courses

# Проверка миграции
python manage.py shell -c "from apps.courses.models import ContentElement; print(ContentElement.objects.first().data)"
```
