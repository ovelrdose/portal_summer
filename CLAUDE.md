# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Educational portal for author courses. Django 5.x REST API backend + React 18 frontend with Bootstrap 5.

## Common Commands

### Docker (recommended)
```bash
docker-compose up -d              # Start all services
docker-compose logs -f            # View logs
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose down               # Stop services
```

### Backend (local development)
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver        # Runs on http://localhost:8000
```

### Frontend (local development)
```bash
cd frontend
npm install
npm start                         # Runs on http://localhost:3000
npm run build                     # Production build
npm test                          # Run tests
```

## Architecture

### Backend Structure
- `backend/portal_summer/` - Django project settings, root URL configuration
- `backend/apps/users/` - Custom User model (email-based auth), roles, permissions
- `backend/apps/news/` - News with tags, CKEditor 5 rich text
- `backend/apps/gallery/` - Photo albums with bulk upload
- `backend/apps/courses/` - Courses, sections, content elements, homework submissions
- `backend/apps/core/` - Admin statistics endpoints

### Frontend Structure
- `frontend/src/services/api.js` - Centralized API client (axios with token interceptor)
- `frontend/src/contexts/AuthContext.js` - Auth state, login/logout, user data
- `frontend/src/pages/` - Page components by feature (auth/, portal/, admin/)
- `frontend/src/components/layout/` - Navbar, Footer

### User Roles & Permissions
Defined in `apps/users/models.py` and `apps/users/permissions.py`:
- **Admin** (`is_admin`): Full access, assign roles, view statistics, manage all content
- **Teacher** (`is_teacher`): Create/edit own courses, review homework (includes admin capabilities)
- **User**: Subscribe to courses, submit homework, manage profile

Permission classes: `IsAdmin`, `IsTeacher`, `IsOwnerOrAdmin`

### Course Structure
Hierarchical model in `apps/courses/models.py`:
- **Course**: title, description (CKEditor), creator, subscribers (M2M via Subscription)
- **Section**: belongs to Course, ordered, publishable
- **ContentElement**: belongs to Section, types: text, image, link, homework
- **HomeworkSubmission**: user submission with file, status (submitted/reviewed)

### Key API Patterns
Authentication uses `dj-rest-auth` with Token authentication:
- Token stored in localStorage, sent as `Authorization: Token <token>`
- 401 responses trigger automatic logout redirect

Course actions: `/api/courses/{id}/subscribe/`, `/api/courses/{id}/unsubscribe/`

### Environment Variables
Backend: Copy `backend/.env.example` to `backend/.env`
Frontend: Set `REACT_APP_API_URL` (defaults to `http://localhost:8000/api`)
Не запускай файлы бекенда и фронтеда. Я буду делать это сам. Чтобы убедиться в работе приложения используй npm build

