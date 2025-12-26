# Troubleshooting Guide

Руководство по решению распространенных проблем в проекте portal_summer.

## Модуль новостей

### Проблема: Теги не отображаются в редакторе новостей

**Симптомы:**
- В редакторе новостей (страница создания/редактирования) отсутствует секция с тегами
- Раздел "Теги" пустой

**Причина:**
В базе данных отсутствуют теги. При первом развертывании приложения теги не создаются автоматически.

**Решение:**
1. Запустите команду для создания стандартных тегов:
   ```bash
   cd backend
   python manage.py create_default_tags
   ```

2. Или создайте теги вручную через Django Admin:
   - Перейдите на http://localhost:8000/admin/
   - Найдите раздел "News" → "Tags"
   - Создайте необходимые теги

**Проверка:**
1. Проверьте наличие тегов в базе данных:
   ```bash
   python manage.py shell -c "from apps.news.models import Tag; print(Tag.objects.count())"
   ```

2. Проверьте API endpoint:
   ```bash
   curl http://localhost:8000/api/news/tags/
   ```

3. Обновите страницу редактора новостей в браузере

### Проблема: Ошибка загрузки изображений в новостях

**Причина:**
Неправильно настроены MEDIA_ROOT или отсутствуют права на запись в директорию.

**Решение:**
1. Проверьте настройки в `backend/portal_summer/settings.py`:
   ```python
   MEDIA_URL = '/media/'
   MEDIA_ROOT = BASE_DIR / 'media'
   ```

2. Убедитесь, что директория media существует и доступна для записи:
   ```bash
   cd backend
   mkdir -p media/news/content
   ```

## Модуль курсов

### Проблема: Ошибка при создании курса

**Проверьте:**
1. Пользователь имеет роль Admin или Teacher
2. Все обязательные поля заполнены
3. В консоли браузера нет ошибок API

## Аутентификация

### Проблема: Пользователь не может войти

**Проверьте:**
1. Email подтвержден (если включена email-верификация)
2. Пароль введен правильно
3. Backend запущен и доступен по адресу из REACT_APP_API_URL

### Проблема: Автоматический выход из системы

**Причина:**
Токен аутентификации истек или был удален.

**Решение:**
1. Войдите заново
2. Проверьте настройки токена в settings.py

## Docker

### Проблема: Контейнеры не запускаются

**Решение:**
1. Проверьте логи:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

2. Пересоздайте контейнеры:
   ```bash
   docker-compose down -v
   docker-compose up -d --build
   ```

3. Проверьте, что порты 8000 и 3000 свободны:
   ```bash
   # Windows
   netstat -ano | findstr "8000"
   netstat -ano | findstr "3000"

   # Linux/Mac
   lsof -i :8000
   lsof -i :3000
   ```

## Frontend

### Проблема: Ошибка при сборке фронтенда

**Решение:**
1. Очистите кеш и переустановите зависимости:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. Проверьте версию Node.js (требуется >= 14.x):
   ```bash
   node --version
   ```

## Backend

### Проблема: Ошибка миграций

**Решение:**
1. Откатите миграции:
   ```bash
   python manage.py migrate news zero
   python manage.py migrate
   ```

2. Пересоздайте миграции (только для разработки):
   ```bash
   # ВНИМАНИЕ: Удалит все данные!
   rm db.sqlite3
   rm -rf apps/*/migrations/0*.py
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py create_default_tags
   ```

## Общие советы

1. **Проверяйте консоль браузера** - большинство ошибок фронтенда отображаются там
2. **Проверяйте терминал с бэкендом** - Django выводит подробные ошибки
3. **Используйте Django Debug Toolbar** - полезен для отладки API
4. **Проверяйте сетевую вкладку** в DevTools - показывает все API запросы и ответы

## Полезные команды

### Проверка статуса сервисов
```bash
# Backend
curl http://localhost:8000/api/
# Frontend
curl http://localhost:3000/
```

### Просмотр логов
```bash
# Backend (local)
cd backend && python manage.py runserver

# Backend (docker)
docker-compose logs -f backend

# Frontend
cd frontend && npm start
```

### Создание тестовых данных
```bash
cd backend
python manage.py shell < scripts/create_test_data.py
```
