# Анализ исправлений уязвимостей доступа к заблокированному контенту

## Обнаруженные уязвимости

### 1. SectionViewSet.list() - Отсутствие фильтрации
**Проблема**: Метод `list()` возвращал все разделы без проверки блокировки по `publish_datetime`.
**Риск**: Студенты могли получить список всех разделов, включая заблокированные.
**Статус**: ✅ Исправлено

### 2. ContentElementViewSet.list() - Отсутствие фильтрации
**Проблема**: Метод `list()` возвращал все элементы без проверки блокировки.
**Риск**: Студенты могли получить прямой доступ к заблокированным элементам через `/api/elements/?section=X`.
**Статус**: ✅ Исправлено

### 3. ContentElementSerializer - Непоследовательное скрытие данных
**Проблема**: Только `ContentElementDetailSerializer` скрывал данные в `to_representation()`, но при вызове `list()` использовался `ContentElementSerializer` без этой логики.
**Риск**: Даже если элемент помечен `is_locked=true`, его `data` содержал полную информацию.
**Статус**: ✅ Исправлено

### 4. Отсутствие проверки подписки на курс
**Проблема**: Разделы и элементы возвращались всем аутентифицированным пользователям без проверки подписки.
**Риск**: Неподписанные студенты могли просматривать контент чужих курсов.
**Статус**: ✅ Исправлено

## Реализованные исправления

### 1. Создан модуль permissions.py
Добавлены два кастомных permission класса:

#### IsAccessibleOrAdmin
- Проверяет доступность контента через метод `is_locked_for_user()`
- Админы и преподаватели получают полный доступ
- Студенты получают доступ только к разблокированному контенту

#### IsCourseSubscriberOrAdmin
- Проверяет подписку пользователя на курс через модель `Subscription`
- Владелец курса имеет полный доступ
- Админы имеют доступ ко всему
- Преподаватели имеют доступ к опубликованным курсам
- Студенты должны быть подписаны на курс

### 2. Исправлен SectionViewSet
**Изменения в `get_queryset()`**:
```python
# Для студентов фильтруем:
# 1. Только опубликованные разделы (is_published=True)
# 2. Только разблокированные (publish_datetime IS NULL OR publish_datetime <= NOW)
queryset = queryset.filter(is_published=True)
queryset = queryset.filter(
    Q(publish_datetime__isnull=True) | Q(publish_datetime__lte=now)
)
```

**Изменения в `get_permissions()`**:
- Для `list()` и `retrieve()`: требуется `IsCourseSubscriberOrAdmin`
- Теперь студенты без подписки получат 403 Forbidden

### 3. Исправлен ContentElementViewSet
**Изменения в `get_queryset()`**:
```python
# Для студентов фильтруем:
# 1. Только опубликованные элементы
# 2. Только разблокированные элементы
# 3. Только элементы из разблокированных разделов
queryset = queryset.filter(is_published=True)
queryset = queryset.filter(
    Q(publish_datetime__isnull=True) | Q(publish_datetime__lte=now)
)
queryset = queryset.filter(
    section__is_published=True
).filter(
    Q(section__publish_datetime__isnull=True) | Q(section__publish_datetime__lte=now)
)
```

**Изменения в `get_permissions()`**:
- Для `list()` и `retrieve()`: требуется `IsCourseSubscriberOrAdmin`

### 4. Унифицирован ContentElementSerializer
Добавлен метод `to_representation()` для скрытия данных:
```python
def to_representation(self, instance):
    representation = super().to_representation(instance)
    user = request.user if request and request.user.is_authenticated else None

    # Если элемент заблокирован - скрываем контент
    if instance.is_locked_for_user(user):
        representation['data'] = {}

    return representation
```

Теперь **оба** сериализатора (`ContentElementSerializer` и `ContentElementDetailSerializer`) скрывают данные заблокированных элементов.

## Матрица доступа

| Роль | Видит заблокированные разделы? | Видит заблокированные элементы? | Видит контент заблокированных? | Требуется подписка? |
|------|-------------------------------|--------------------------------|-------------------------------|---------------------|
| Админ | ✅ Да | ✅ Да | ✅ Да | ❌ Нет |
| Преподаватель (владелец) | ✅ Да | ✅ Да | ✅ Да | ❌ Нет |
| Преподаватель (не владелец) | ✅ Да | ✅ Да | ✅ Да | ❌ Нет (если курс опубликован) |
| Студент (подписан) | ❌ Нет | ❌ Нет | ❌ Нет | ✅ Да |
| Студент (не подписан) | ⛔ 403 Forbidden | ⛔ 403 Forbidden | ⛔ 403 Forbidden | ✅ Да |
| Неаутентифицированный | ⛔ Empty queryset | ⛔ Empty queryset | ⛔ Empty queryset | ⛔ N/A |

## Тестовые сценарии

### Сценарий 1: Студент пытается получить список заблокированных разделов
**Endpoint**: `GET /api/sections/?course=1`

**Дано**:
- Студент подписан на курс ID=1
- Курс содержит:
  - Раздел A (publish_datetime=NULL) - разблокирован
  - Раздел B (publish_datetime=2025-12-25 10:00) - заблокирован
  - Раздел C (publish_datetime=2025-12-20 10:00) - разблокирован (дата прошла)

**Ожидается**:
- Студент видит только разделы A и C
- Раздел B НЕ возвращается в queryset

**Тест**:
```python
# Войти как студент
# GET /api/sections/?course=1
# Проверить: len(response.data) == 2
# Проверить: section B отсутствует в списке
```

### Сценарий 2: Студент пытается получить заблокированный элемент напрямую
**Endpoint**: `GET /api/elements/5/`

**Дано**:
- Студент подписан на курс
- Элемент ID=5 имеет publish_datetime в будущем

**Ожидается**:
- HTTP 403 Forbidden
- Сообщение: "Элемент заблокирован"
- Возврат unlock_datetime

**Тест**:
```python
# Войти как студент
# GET /api/elements/5/
# Проверить: response.status_code == 403
# Проверить: 'unlock_datetime' in response.data
```

### Сценарий 3: Студент пытается получить список элементов через query параметр
**Endpoint**: `GET /api/elements/?section=2`

**Дано**:
- Студент подписан на курс
- Раздел ID=2 содержит:
  - Элемент 1 (publish_datetime=NULL) - разблокирован
  - Элемент 2 (publish_datetime=будущее) - заблокирован
  - Элемент 3 (publish_datetime=прошлое) - разблокирован

**Ожидается**:
- Студент видит только элементы 1 и 3
- Элемент 2 НЕ возвращается в queryset

**Тест**:
```python
# Войти как студент
# GET /api/elements/?section=2
# Проверить: len(response.data) == 2
# Проверить: элемент 2 отсутствует
```

### Сценарий 4: Неподписанный студент пытается получить доступ к разделу
**Endpoint**: `GET /api/sections/?course=1`

**Дано**:
- Студент НЕ подписан на курс ID=1
- Студент НЕ является владельцем курса

**Ожидается**:
- HTTP 403 Forbidden (через IsCourseSubscriberOrAdmin)

**Тест**:
```python
# Войти как студент без подписки
# GET /api/sections/?course=1
# Проверить: response.status_code == 403
```

### Сценарий 5: Преподаватель видит все разделы и элементы
**Endpoint**: `GET /api/sections/?course=1` и `GET /api/elements/?section=2`

**Дано**:
- Пользователь с ролью teacher
- Курс содержит заблокированные разделы и элементы

**Ожидается**:
- Преподаватель видит ВСЕ разделы и элементы, включая заблокированные
- Поле `is_locked` корректно показывает статус для справки

**Тест**:
```python
# Войти как преподаватель
# GET /api/sections/?course=1
# Проверить: видны все разделы (включая заблокированные)
# GET /api/elements/?section=2
# Проверить: видны все элементы (включая заблокированные)
```

### Сценарий 6: Проверка скрытия данных в ContentElementSerializer
**Endpoint**: `GET /api/elements/?section=2`

**Дано**:
- Студент получает список элементов
- Один элемент заблокирован (но по ошибке попал в queryset - не должно произойти после фиксов)

**Ожидается**:
- Если заблокированный элемент каким-то образом попал в response (резервная защита)
- Поле `data` должно быть пустым объектом `{}`

**Тест**:
```python
# Войти как студент
# GET /api/elements/?section=2
# Для каждого элемента с is_locked=true:
#   Проверить: element['data'] == {}
```

### Сценарий 7: Элемент из заблокированного раздела
**Endpoint**: `GET /api/elements/?section=3`

**Дано**:
- Раздел ID=3 имеет publish_datetime в будущем (заблокирован)
- Раздел содержит элемент ID=10 без своего publish_datetime

**Ожидается**:
- Студент НЕ видит элемент ID=10, т.к. родительский раздел заблокирован
- Queryset фильтрует по `section__publish_datetime`

**Тест**:
```python
# Войти как студент
# GET /api/elements/?section=3
# Проверить: response.data == [] (пустой список)
```

## Контрольный чек-лист безопасности

### Валидация входных данных
- ✅ Все входные данные валидируются на уровне сериализаторов
- ✅ BlockDataValidator валидирует JSON данные блоков
- ✅ Query параметры (course, section) безопасны (используются в ORM фильтрах)

### Проверка прав доступа
- ✅ Все endpoints защищены permission classes
- ✅ IsCourseSubscriberOrAdmin проверяет подписку через ORM
- ✅ IsCourseOwnerOrAdmin проверяет владение контентом
- ✅ IsAccessibleOrAdmin проверяет блокировку контента

### Защита от mass assignment
- ✅ Сериализаторы явно указывают fields в Meta
- ✅ read_only_fields используются для защиты критичных полей

### Безопасная работа с файлами
- ✅ upload_image валидирует расширения файлов
- ✅ Размер файлов ограничен (5 МБ)
- ✅ Файлы сохраняются в определенную директорию

### Использование параметризованных запросов
- ✅ Везде используется Django ORM (параметризованные запросы)
- ✅ Нет raw SQL запросов с пользовательским вводом

### Избегание N+1 запросов
- ✅ SectionViewSet.get_queryset() использует select_related('course')
- ✅ ContentElementViewSet.get_queryset() использует select_related('section', 'section__course')
- ✅ HomeworkSubmissionViewSet использует select_related для вложенных структур

### Индексы для производительности
- ✅ Section.publish_datetime имеет индекс (models.Index)
- ✅ ContentElement.publish_datetime имеет индекс

## Миграции

Изменения моделей отсутствуют - миграции не требуются.

Были изменены только:
- Views (логика фильтрации)
- Serializers (логика скрытия данных)
- Добавлен новый файл permissions.py

## Рекомендации по дальнейшему тестированию

### 1. Ручное тестирование
- Создать тестовых пользователей с разными ролями
- Создать курс с заблокированными разделами и элементами
- Пройти все сценарии из раздела выше

### 2. Автоматизированные тесты
Создать `apps/courses/tests/test_access_control.py`:
```python
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from apps.users.models import User
from apps.courses.models import Course, Section, ContentElement, Subscription

class AccessControlTestCase(TestCase):
    def setUp(self):
        # Создать тестовых пользователей
        self.admin = User.objects.create_user(email='admin@test.com', is_admin=True)
        self.teacher = User.objects.create_user(email='teacher@test.com', is_teacher=True)
        self.student = User.objects.create_user(email='student@test.com')

        # Создать курс с контентом
        self.course = Course.objects.create(title='Test', creator=self.teacher, is_published=True)

        # Разделы
        self.unlocked_section = Section.objects.create(course=self.course, title='Unlocked')
        self.locked_section = Section.objects.create(
            course=self.course,
            title='Locked',
            publish_datetime=timezone.now() + timedelta(days=7)
        )

        # API клиент
        self.client = APIClient()

    def test_student_cannot_see_locked_sections(self):
        # Подписываем студента
        Subscription.objects.create(user=self.student, course=self.course)

        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/sections/?course={self.course.id}')

        self.assertEqual(response.status_code, 200)
        section_ids = [s['id'] for s in response.data]
        self.assertIn(self.unlocked_section.id, section_ids)
        self.assertNotIn(self.locked_section.id, section_ids)

    def test_teacher_can_see_all_sections(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(f'/api/sections/?course={self.course.id}')

        self.assertEqual(response.status_code, 200)
        section_ids = [s['id'] for s in response.data]
        self.assertIn(self.unlocked_section.id, section_ids)
        self.assertIn(self.locked_section.id, section_ids)

    # Добавить остальные тесты...
```

### 3. Нагрузочное тестирование
- Проверить производительность с большим количеством разделов и элементов
- Убедиться, что нет N+1 запросов (использовать Django Debug Toolbar)

### 4. Проверка логов
- Мониторить 403 ошибки - должны появляться при попытках неавторизованного доступа
- Проверить, нет ли массовых 500 ошибок после изменений

## Заключение

Все критические уязвимости безопасности были устранены:
1. ✅ Студенты НЕ могут видеть заблокированные разделы через list()
2. ✅ Студенты НЕ могут видеть заблокированные элементы через list()
3. ✅ Студенты НЕ могут получить данные заблокированных элементов
4. ✅ Студенты БЕЗ подписки не имеют доступа к контенту курса
5. ✅ Админы и преподаватели сохраняют полный доступ
6. ✅ Все endpoint'ы защищены permission classes
7. ✅ Логика фильтрации работает на уровне queryset (невозможен обход)

Система теперь соответствует принципу "defense in depth":
- Уровень 1: Permission classes (проверка прав доступа)
- Уровень 2: Фильтрация queryset (блокировка на уровне БД)
- Уровень 3: Проверка в retrieve() (дополнительная защита)
- Уровень 4: Скрытие данных в serializers (резервная защита)
