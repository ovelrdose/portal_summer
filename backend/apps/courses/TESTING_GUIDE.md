# Руководство по тестированию безопасности доступа к контенту

## Быстрый старт

### Подготовка тестового окружения

1. Создайте тестовых пользователей:
```bash
python manage.py shell
```

```python
from apps.users.models import User
from apps.courses.models import Course, Section, ContentElement, Subscription
from django.utils import timezone
from datetime import timedelta

# Админ
admin = User.objects.create_user(
    email='admin@test.com',
    password='admin123',
    first_name='Admin',
    last_name='User',
    is_admin=True
)

# Преподаватель
teacher = User.objects.create_user(
    email='teacher@test.com',
    password='teacher123',
    first_name='Teacher',
    last_name='User',
    is_teacher=True
)

# Студент 1 (подписан)
student1 = User.objects.create_user(
    email='student1@test.com',
    password='student123',
    first_name='Student',
    last_name='One'
)

# Студент 2 (не подписан)
student2 = User.objects.create_user(
    email='student2@test.com',
    password='student123',
    first_name='Student',
    last_name='Two'
)
```

2. Создайте тестовый курс с заблокированным контентом:
```python
# Курс
course = Course.objects.create(
    title='Тестовый курс безопасности',
    short_description='Курс для тестирования прав доступа',
    creator=teacher,
    is_published=True
)

# Подписываем student1 на курс
Subscription.objects.create(user=student1, course=course)

# Раздел 1: Разблокирован
section1 = Section.objects.create(
    course=course,
    title='Раздел 1: Доступен',
    order=1,
    is_published=True,
    publish_datetime=None  # Разблокирован
)

# Раздел 2: Заблокирован до завтра
section2 = Section.objects.create(
    course=course,
    title='Раздел 2: Заблокирован',
    order=2,
    is_published=True,
    publish_datetime=timezone.now() + timedelta(days=1)
)

# Элемент 1: Разблокирован (в разблокированном разделе)
element1 = ContentElement.objects.create(
    section=section1,
    content_type='text',
    title='Элемент 1: Доступен',
    data={'type': 'text', 'html': '<p>Доступный контент</p>'},
    order=1,
    is_published=True
)

# Элемент 2: Заблокирован (в разблокированном разделе)
element2 = ContentElement.objects.create(
    section=section1,
    content_type='text',
    title='Элемент 2: Заблокирован',
    data={'type': 'text', 'html': '<p>Заблокированный контент</p>'},
    order=2,
    is_published=True,
    publish_datetime=timezone.now() + timedelta(days=2)
)

# Элемент 3: В заблокированном разделе
element3 = ContentElement.objects.create(
    section=section2,
    content_type='text',
    title='Элемент 3: В заблокированном разделе',
    data={'type': 'text', 'html': '<p>Контент заблокированного раздела</p>'},
    order=1,
    is_published=True
)

print(f"Курс создан: ID={course.id}")
print(f"Раздел 1 (доступен): ID={section1.id}")
print(f"Раздел 2 (заблокирован): ID={section2.id}")
print(f"Элемент 1 (доступен): ID={element1.id}")
print(f"Элемент 2 (заблокирован): ID={element2.id}")
print(f"Элемент 3 (в заблокированном разделе): ID={element3.id}")
```

## Тестовые сценарии

### Используйте Postman, curl или браузерные инструменты

### Получение токена авторизации
```bash
# Student 1 (подписан)
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@test.com","password":"student123"}'

# Сохраните токен из response.data.key
```

### Тест 1: Студент с подпиской видит только доступные разделы
```bash
# Замените YOUR_TOKEN на реальный токен
curl -X GET "http://localhost:8000/api/sections/?course=COURSE_ID" \
  -H "Authorization: Token YOUR_TOKEN"

# Ожидается:
# - Видны только разделы без publish_datetime или с publish_datetime в прошлом
# - Раздел 2 (заблокирован) НЕ должен быть в списке
```

### Тест 2: Студент с подпиской видит только доступные элементы
```bash
curl -X GET "http://localhost:8000/api/elements/?section=SECTION1_ID" \
  -H "Authorization: Token YOUR_TOKEN"

# Ожидается:
# - Элемент 1 (доступен) - присутствует
# - Элемент 2 (заблокирован) - ОТСУТСТВУЕТ
```

### Тест 3: Студент НЕ видит элементы из заблокированного раздела
```bash
curl -X GET "http://localhost:8000/api/elements/?section=SECTION2_ID" \
  -H "Authorization: Token YOUR_TOKEN"

# Ожидается:
# - Пустой список [] или 403 Forbidden
```

### Тест 4: Студент не может получить заблокированный элемент напрямую
```bash
curl -X GET "http://localhost:8000/api/elements/ELEMENT2_ID/" \
  -H "Authorization: Token YOUR_TOKEN"

# Ожидается:
# - HTTP 403 Forbidden
# - Сообщение: "Элемент заблокирован"
```

### Тест 5: Неподписанный студент получает 403
```bash
# Войдите как student2 (не подписан)
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"student2@test.com","password":"student123"}'

curl -X GET "http://localhost:8000/api/sections/?course=COURSE_ID" \
  -H "Authorization: Token STUDENT2_TOKEN"

# Ожидается:
# - HTTP 403 Forbidden (нет подписки на курс)
```

### Тест 6: Преподаватель видит все разделы и элементы
```bash
# Войдите как teacher
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@test.com","password":"teacher123"}'

curl -X GET "http://localhost:8000/api/sections/?course=COURSE_ID" \
  -H "Authorization: Token TEACHER_TOKEN"

# Ожидается:
# - ВСЕ разделы видны (включая заблокированные)
# - Поле is_locked корректно показывает статус

curl -X GET "http://localhost:8000/api/elements/?section=SECTION2_ID" \
  -H "Authorization: Token TEACHER_TOKEN"

# Ожидается:
# - ВСЕ элементы видны (включая заблокированные)
# - Поле data содержит полную информацию
```

### Тест 7: Админ имеет полный доступ
```bash
# Войдите как admin
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

curl -X GET "http://localhost:8000/api/sections/" \
  -H "Authorization: Token ADMIN_TOKEN"

# Ожидается:
# - Все разделы всех курсов видны
# - Нет фильтрации по блокировке
```

### Тест 8: Проверка скрытия данных в заблокированных элементах
```bash
# Войдите как student1
curl -X GET "http://localhost:8000/api/elements/?section=SECTION1_ID" \
  -H "Authorization: Token STUDENT1_TOKEN"

# Проверьте JSON response:
# Для заблокированных элементов (если они каким-то образом попали в response):
# - is_locked: true
# - data: {} (пустой объект)
```

## Контрольный список безопасности

После выполнения всех тестов убедитесь:

- [ ] Студент с подпиской видит только разблокированные разделы
- [ ] Студент с подпиской видит только разблокированные элементы
- [ ] Студент не может получить заблокированный раздел через GET /api/sections/ID/
- [ ] Студент не может получить заблокированный элемент через GET /api/elements/ID/
- [ ] Студент БЕЗ подписки получает 403 при попытке доступа к разделам/элементам
- [ ] Неаутентифицированный пользователь не имеет доступа к разделам/элементам
- [ ] Преподаватель видит ВСЕ разделы и элементы (включая заблокированные)
- [ ] Админ видит ВСЕ разделы и элементы
- [ ] Поле `is_locked` корректно отражает статус блокировки
- [ ] Поле `data` пустое для заблокированных элементов в response студента
- [ ] Вложенные элементы в SectionSerializer фильтруются корректно

## Автоматизированное тестирование

Для запуска автоматизированных тестов (когда будут созданы):
```bash
python manage.py test apps.courses.tests.test_access_control
```

## Мониторинг безопасности

### Проверьте логи на наличие:
- Массовых 403 ошибок от одного пользователя (попытка перебора)
- Попыток доступа к несуществующим ID
- Аномального количества запросов к заблокированному контенту

### Используйте Django Debug Toolbar для проверки:
- Количества SQL запросов (должно быть оптимизировано с select_related)
- Времени выполнения запросов
- Отсутствия N+1 проблем

## Очистка тестовых данных

После завершения тестирования:
```python
from apps.courses.models import Course

# Удалить тестовый курс (каскадно удалит разделы и элементы)
Course.objects.filter(title='Тестовый курс безопасности').delete()

# Удалить тестовых пользователей
User.objects.filter(email__in=[
    'admin@test.com',
    'teacher@test.com',
    'student1@test.com',
    'student2@test.com'
]).delete()
```

## Контакты

При обнаружении проблем безопасности:
1. НЕ публикуйте информацию публично
2. Сообщите разработчикам напрямую
3. Предоставьте подробные шаги воспроизведения
