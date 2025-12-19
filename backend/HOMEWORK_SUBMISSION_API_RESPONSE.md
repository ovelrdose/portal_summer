# HomeworkSubmission API Response Structure

## Изменения

### До исправления
```json
{
  "id": 1,
  "element": 123,  // только ID
  "user": {
    "id": 5,
    "email": "student@example.com",
    "full_name": "Иван Иванов"
  },
  "file": "http://localhost:8000/media/courses/homework/assignment.pdf",
  "comment": "Выполнено задание",
  "status": "submitted",
  "teacher_comment": "",
  "grade": null,
  "submitted_at": "2025-12-19T10:30:00Z",
  "reviewed_at": null
}
```

### После исправления
```json
{
  "id": 1,
  "element": {
    "id": 123,
    "title": "Домашнее задание 1",
    "content_type": "homework",
    "section": {
      "id": 10,
      "title": "Раздел 1: Введение в Python",
      "course": {
        "id": 5,
        "title": "Курс Python для начинающих"
      }
    }
  },
  "user": {
    "id": 5,
    "email": "student@example.com",
    "full_name": "Иван Иванов"
  },
  "file": "http://localhost:8000/media/courses/homework/assignment.pdf",
  "comment": "Выполнено задание",
  "status": "submitted",
  "teacher_comment": "",
  "grade": null,
  "submitted_at": "2025-12-19T10:30:00Z",
  "reviewed_at": null
}
```

## Используемые эндпоинты

- `GET /api/courses/homework/` - Список домашних заданий (для текущего пользователя или преподавателя)
- `GET /api/courses/homework/{id}/` - Детальная информация о домашнем задании
- `POST /api/courses/homework/` - Создание нового домашнего задания (студент)
- `POST /api/courses/homework/{id}/review/` - Проверка домашнего задания (преподаватель)

## Примеры использования на фронтенде

### Получение информации о разделе
```javascript
const sectionTitle = hw.element?.section?.title;
const sectionId = hw.element?.section?.id;
```

### Получение информации о курсе
```javascript
const courseTitle = hw.element?.section?.course?.title;
const courseId = hw.element?.section?.course?.id;
```

### Получение информации об элементе
```javascript
const elementTitle = hw.element?.title;
const elementType = hw.element?.content_type;
```

## Оптимизация запросов

В `HomeworkSubmissionViewSet.get_queryset()` используется `select_related` для предотвращения N+1 запросов:

```python
base_queryset = HomeworkSubmission.objects.select_related(
    'element',                    # ForeignKey
    'element__section',           # ForeignKey через element
    'element__section__course',   # ForeignKey через element.section
    'user'                        # ForeignKey
)
```

Это означает, что для получения 100 домашних заданий будет выполнено всего **1 SQL запрос** вместо **401 запроса** (1 основной + 100*4 вложенных).

## Совместимость

### Создание/обновление домашнего задания
При создании или обновлении используется `element_id` (write-only поле):

```javascript
// POST /api/courses/homework/
{
  "element_id": 123,  // ID элемента контента типа homework
  "file": <file>,
  "comment": "Комментарий студента"
}
```

Поле `element` остается read-only и будет возвращено с полной вложенной структурой в ответе.
