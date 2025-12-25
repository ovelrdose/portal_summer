@echo off
REM Скрипт для инициализации проекта portal_summer на Windows
REM Использование: init_project.bat

echo ===================================
echo Portal Summer - Project Initialization
echo ===================================
echo.

echo Step 1: Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Running migrations...
python manage.py migrate
if errorlevel 1 (
    echo ERROR: Failed to run migrations
    pause
    exit /b 1
)

echo.
echo Step 3: Creating default tags...
python manage.py create_default_tags
if errorlevel 1 (
    echo WARNING: Failed to create default tags
)

echo.
echo Step 4: Checking for superuser...
python manage.py shell -c "from apps.users.models import User; exit(0 if User.objects.filter(is_admin=True).exists() else 1)"

if errorlevel 1 (
    echo No superuser found. Creating one...
    echo.
    echo Please enter superuser credentials:
    python manage.py createsuperuser
)

echo.
echo ===================================
echo Project initialization completed!
echo ===================================
echo.
echo Next steps:
echo 1. Start the backend server:
echo    python manage.py runserver
echo.
echo 2. In another terminal, start the frontend:
echo    cd ..\frontend
echo    npm install
echo    npm start
echo.
echo 3. Access the admin panel:
echo    http://localhost:8000/admin/
echo.
echo 4. Access the application:
echo    http://localhost:3000/
echo.
pause
