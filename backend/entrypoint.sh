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

# 4. Создаем суперпользователя с подтверждённым email
if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating superuser with confirmed email (if not exists)..."
    python manage.py shell << EOF
from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress

User = get_user_model()

email = '$DJANGO_SUPERUSER_EMAIL'
password = '$DJANGO_SUPERUSER_PASSWORD'
first_name = '${DJANGO_SUPERUSER_USERNAME:-admin}'

# Проверяем, существует ли пользователь
if not User.objects.filter(email=email).exists():
    # Создаём суперпользователя
    admin = User.objects.create_superuser(
        email=email,
        password=password,
        first_name=first_name,
        is_active=True,
        is_staff=True,
        is_superuser=True
    )
    
    # Подтверждаем email через allauth
    EmailAddress.objects.create(
        user=admin,
        email=email,
        verified=True,
        primary=True
    )
    
    print(f"✅ Superuser created: {email}")
    print(f"   Email confirmed: True")
else:
    # Пользователь уже существует — убеждаемся, что email подтверждён
    admin = User.objects.get(email=email)
    email_address = EmailAddress.objects.filter(user=admin, email=email).first()
    
    if not email_address:
        EmailAddress.objects.create(
            user=admin,
            email=email,
            primary=True
        )
        print(f"✅ Email confirmed for existing user: {email}")
    elif not email_address.verified:

        email_address.verified = True
        email_address.primary = True
        email_address.save()
        print(f"✅ Email re-confirmed for existing user: {email}")
    else:
        print(f"ℹ️  Superuser already exists with confirmed email: {email}")
EOF
fi

# 5. Запускаем Gunicorn
echo "🎉 Starting Gunicorn..."

exec gunicorn portal_summer.wsgi:application --bind 0.0.0.0:8000 --workers 3
