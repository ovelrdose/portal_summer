#!/bin/bash
set -e  # Остановить скрипт при любой ошибке

echo "🚀 Starting Django application..."

# 1. Ждем, пока PostgreSQL будет готов (максимум 30 секунд)
echo "Waiting for PostgreSQL..."
max_retries=30
counter=0
until python -c "import socket; s=socket.socket(); s.settimeout(1); s.connect(('db', 5432)); s.close()" 2>/dev/null; do
    counter=$((counter+1))
    if [ $counter -ge $max_retries ]; then
        echo "❌ PostgreSQL is not available after ${max_retries} seconds"
        exit 1
    fi
    echo "  PostgreSQL is unavailable - sleeping (attempt $counter/$max_retries)"
    sleep 1
done
echo "✅ PostgreSQL is up!"

# 2. Применяем миграции
echo "Applying migrations..."
python manage.py migrate --noinput

# 3. Собираем статику
echo "Collecting static files..."
python manage.py collectstatic --noinput

# 4. Создаем суперпользователя, если заданы переменные окружения
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating superuser (if not exists)..."
    python manage.py createsuperuser --noinput || echo "ℹ️  Superuser already exists, skipping"
fi

# 5. Запускаем Gunicorn
echo "🎉 Starting Gunicorn..."
exec gunicorn portal_summer.wsgi:application --bind 0.0.0.0:8000 --workers 3
