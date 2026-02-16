"""
Тесты для API статистики.

Для запуска тестов:
    python manage.py test apps.core
"""

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from apps.users.models import User
from apps.courses.models import Course, Section, ContentElement, HomeworkSubmission, Subscription


class GlobalStatsAPITestCase(TestCase):
    """Тесты для глобальной статистики (только администраторы)."""

    def setUp(self):
        """Создание тестовых данных."""
        # Создаем администратора
        self.admin = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            first_name='Admin',
            last_name='User',
            role=User.Role.ADMIN
        )

        # Создаем преподавателя
        self.teacher = User.objects.create_user(
            email='teacher@test.com',
            password='testpass123',
            first_name='Teacher',
            last_name='User',
            role=User.Role.TEACHER
        )

        # Создаем обычного пользователя
        self.user = User.objects.create_user(
            email='student@test.com',
            password='testpass123',
            first_name='Student',
            last_name='User',
            role=User.Role.USER
        )

        # Создаем курс
        self.course = Course.objects.create(
            title='Test Course',
            short_description='Test description',
            creator=self.teacher,
            is_published=True
        )

        self.client = APIClient()

    def test_global_stats_admin_access(self):
        """Администратор может получить глобальную статистику."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('global-stats')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', response.data)
        self.assertIn('total_courses', response.data)
        self.assertEqual(response.data['total_users'], 3)
        self.assertEqual(response.data['total_courses'], 1)

    def test_global_stats_non_admin_denied(self):
        """Не-администратор не может получить глобальную статистику."""
        self.client.force_authenticate(user=self.teacher)
        url = reverse('global-stats')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_global_stats_unauthenticated_denied(self):
        """Неавторизованный пользователь не может получить статистику."""
        url = reverse('global-stats')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_top_active_users(self):
        """Получение топа активных пользователей."""
        # Создаем раздел и элемент ДЗ
        section = Section.objects.create(
            course=self.course,
            title='Test Section',
            order=1
        )
        homework_element = ContentElement.objects.create(
            section=section,
            content_type=ContentElement.ContentType.HOMEWORK,
            homework_description='Test homework',
            order=1
        )

        # Создаем подачи ДЗ
        HomeworkSubmission.objects.create(
            element=homework_element,
            user=self.user,
            file='test.pdf',
            comment='Test submission'
        )

        self.client.force_authenticate(user=self.admin)
        url = reverse('top-active-users')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
        self.assertEqual(response.data[0]['email'], self.user.email)
        self.assertEqual(response.data[0]['activity_count'], 1)

    def test_top_popular_courses(self):
        """Получение топа популярных курсов."""
        # Подписываем пользователя на курс
        Subscription.objects.create(user=self.user, course=self.course)

        self.client.force_authenticate(user=self.admin)
        url = reverse('top-popular-courses')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
        self.assertEqual(response.data[0]['id'], self.course.id)
        self.assertEqual(response.data[0]['subscribers_count'], 1)

    def test_users_by_role_filter(self):
        """Фильтрация пользователей по ролям."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('users-by-role')

        # Получаем всех пользователей
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)

        # Фильтруем только преподавателей
        response = self.client.get(url, {'role': 'teacher'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_export_users_csv(self):
        """Экспорт пользователей в CSV."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('export-users-csv')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv; charset=utf-8')
        self.assertIn('attachment', response['Content-Disposition'])


class CourseStatsAPITestCase(TestCase):
    """Тесты для статистики курсов (администраторы и преподаватели)."""

    def setUp(self):
        """Создание тестовых данных."""
        # Создаем администратора
        self.admin = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            first_name='Admin',
            last_name='User',
            role=User.Role.ADMIN
        )

        # Создаем двух преподавателей
        self.teacher1 = User.objects.create_user(
            email='teacher1@test.com',
            password='testpass123',
            first_name='Teacher1',
            last_name='User',
            role=User.Role.TEACHER
        )

        self.teacher2 = User.objects.create_user(
            email='teacher2@test.com',
            password='testpass123',
            first_name='Teacher2',
            last_name='User',
            role=User.Role.TEACHER
        )

        # Создаем курсы
        self.course1 = Course.objects.create(
            title='Course 1',
            short_description='Test',
            creator=self.teacher1,
            is_published=True
        )

        self.course2 = Course.objects.create(
            title='Course 2',
            short_description='Test',
            creator=self.teacher2,
            is_published=True
        )

        self.client = APIClient()

    def test_courses_list_admin_sees_all(self):
        """Администратор видит все курсы."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('courses-list-for-stats')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_courses_list_teacher_sees_own(self):
        """Преподаватель видит только свои курсы."""
        self.client.force_authenticate(user=self.teacher1)
        url = reverse('courses-list-for-stats')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.course1.id)

    def test_course_stats_admin_access(self):
        """Администратор может получить статистику любого курса."""
        self.client.force_authenticate(user=self.admin)
        url = reverse('course-stats', kwargs={'course_id': self.course1.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['course_id'], self.course1.id)
        self.assertIn('subscribers_count', response.data)

    def test_course_stats_teacher_own_course(self):
        """Преподаватель может получить статистику своего курса."""
        self.client.force_authenticate(user=self.teacher1)
        url = reverse('course-stats', kwargs={'course_id': self.course1.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['course_id'], self.course1.id)

    def test_course_stats_teacher_other_course_denied(self):
        """Преподаватель не может получить статистику чужого курса."""
        self.client.force_authenticate(user=self.teacher1)
        url = reverse('course-stats', kwargs={'course_id': self.course2.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_course_stats_with_homework(self):
        """Статистика курса с домашними заданиями и оценками."""
        # Создаем раздел и элемент ДЗ
        section = Section.objects.create(
            course=self.course1,
            title='Test Section',
            order=1
        )
        homework_element = ContentElement.objects.create(
            section=section,
            content_type=ContentElement.ContentType.HOMEWORK,
            homework_description='Test homework',
            order=1
        )

        # Создаем подачу ДЗ с оценкой
        student = User.objects.create_user(
            email='student@test.com',
            password='testpass123',
            first_name='Student',
            last_name='User'
        )

        submission = HomeworkSubmission.objects.create(
            element=homework_element,
            user=student,
            file='test.pdf',
            status=HomeworkSubmission.Status.REVIEWED,
            grade=85
        )

        self.client.force_authenticate(user=self.teacher1)
        url = reverse('course-stats', kwargs={'course_id': self.course1.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['completed_homework_count'], 1)
        self.assertEqual(response.data['total_graded'], 1)
        self.assertEqual(response.data['average_grade'], 85.0)
        self.assertEqual(response.data['grade_distribution']['range_81_100'], 1)

    def test_export_course_stats_csv(self):
        """Экспорт статистики курса в CSV."""
        self.client.force_authenticate(user=self.teacher1)
        url = reverse('export-course-stats-csv', kwargs={'course_id': self.course1.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv; charset=utf-8')
        self.assertIn('attachment', response['Content-Disposition'])
