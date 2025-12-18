#!/usr/bin/env python
"""
Тестовый скрипт для проверки API блочного редактора.

Запуск:
    python backend/test_block_editor.py

Требования:
    - Django сервер должен быть запущен
    - В базе должен быть хотя бы один курс и одна секция
"""

import os
import sys
import django

# Настройка Django окружения
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'portal_summer.settings')
django.setup()

from apps.courses.models import Course, Section, ContentElement
from apps.users.models import User
from django.core.files.uploadedfile import SimpleUploadedFile


def print_section(title: str):
    """Красиво печатает заголовок секции"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_data_migration():
    """Тест 1: Проверка миграции существующих данных"""
    print_section("ТЕСТ 1: Проверка миграции данных")

    elements = ContentElement.objects.all()
    print(f"Всего элементов: {elements.count()}")

    for element in elements:
        print(f"\nID: {element.id}")
        print(f"Тип: {element.content_type}")
        print(f"Заголовок: {element.title or '(нет)'}")
        print(f"Данные: {element.data}")

        # Проверяем, что data не пустой
        if not element.data:
            print("  [!] ОШИБКА: data пустой!")
        else:
            # Проверяем наличие обязательных полей
            if 'version' not in element.data:
                print("  [!] WARNING: отсутствует version")
            if 'type' not in element.data:
                print("  [!] WARNING: отсутствует type")

            print("  [+] Данные успешно мигрированы")


def test_create_blocks():
    """Тест 2: Создание всех типов блоков"""
    print_section("ТЕСТ 2: Создание новых блоков")

    # Получаем первую секцию для тестов
    section = Section.objects.first()
    if not section:
        print("[X] ОШИБКА: Нет ни одной секции. Создайте секцию сначала.")
        return

    print(f"Используем секцию: {section.title} (ID: {section.id})")

    # Тест TEXT блок
    try:
        text_block = ContentElement.objects.create(
            section=section,
            content_type='text',
            title='Тестовый текстовый блок',
            data={
                'version': 1,
                'type': 'text',
                'html': '<h2>Заголовок</h2><p>Это тестовый текст с <strong>форматированием</strong>.</p>'
            },
            order=100
        )
        print(f"[+] TEXT блок создан (ID: {text_block.id})")
    except Exception as e:
        print(f"[X] Ошибка создания TEXT блока: {e}")

    # Тест VIDEO блок (YouTube)
    try:
        video_block = ContentElement.objects.create(
            section=section,
            content_type='video',
            title='Тестовое видео',
            data={
                'version': 1,
                'type': 'video',
                'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'provider': 'youtube',
                'video_id': 'dQw4w9WgXcQ'
            },
            order=101
        )
        print(f"[+] VIDEO блок создан (ID: {video_block.id})")
    except Exception as e:
        print(f"[X] Ошибка создания VIDEO блока: {e}")

    # Тест IMAGE блок
    try:
        image_block = ContentElement.objects.create(
            section=section,
            content_type='image',
            title='Тестовое изображение',
            data={
                'version': 1,
                'type': 'image',
                'url': '/media/courses/content/test-image.jpg',
                'alt': 'Тестовое изображение',
                'caption': 'Рисунок 1. Это подпись к изображению'
            },
            order=102
        )
        print(f"[+] IMAGE блок создан (ID: {image_block.id})")
    except Exception as e:
        print(f"[X] Ошибка создания IMAGE блока: {e}")

    # Тест LINK блок
    try:
        link_block = ContentElement.objects.create(
            section=section,
            content_type='link',
            title='Полезная ссылка',
            data={
                'version': 1,
                'type': 'link',
                'url': 'https://docs.djangoproject.com/',
                'text': 'Документация Django',
                'open_in_new_tab': True
            },
            order=103
        )
        print(f"[+] LINK блок создан (ID: {link_block.id})")
    except Exception as e:
        print(f"[X] Ошибка создания LINK блока: {e}")

    # Тест HOMEWORK блок
    try:
        homework_block = ContentElement.objects.create(
            section=section,
            content_type='homework',
            title='Домашнее задание #1',
            data={
                'version': 1,
                'type': 'homework',
                'description': 'Создайте простое Django приложение',
                'deadline': '2025-12-31T23:59:59Z',
                'max_file_size_mb': 10,
                'allowed_extensions': ['zip', 'tar.gz', 'pdf']
            },
            order=104
        )
        print(f"[+] HOMEWORK блок создан (ID: {homework_block.id})")
    except Exception as e:
        print(f"[X] Ошибка создания HOMEWORK блока: {e}")


def test_validation():
    """Тест 3: Проверка валидации"""
    print_section("ТЕСТ 3: Проверка валидации")

    section = Section.objects.first()
    if not section:
        print("[!] Пропускаем тест: нет секций")
        return

    # Тест 1: Невалидный VIDEO URL
    print("\n1. Невалидный VIDEO URL (должен вызвать ошибку):")
    try:
        ContentElement.objects.create(
            section=section,
            content_type='video',
            data={
                'url': 'https://invalid-video-site.com/video'
            }
        )
        print("[X] ОШИБКА: валидация не сработала!")
    except Exception as e:
        print(f"[+] Правильно: {e}")

    # Тест 2: Пустой TEXT
    print("\n2. TEXT без html (должен работать):")
    try:
        ContentElement.objects.create(
            section=section,
            content_type='text',
            data={'html': ''}
        )
        print("[+] Правильно: пустой html разрешен")
    except Exception as e:
        print(f"[X] ОШИБКА: {e}")

    # Тест 3: LINK с невалидным протоколом
    print("\n3. LINK с невалидным протоколом:")
    try:
        from apps.courses.serializers import BlockDataValidator
        BlockDataValidator.validate('link', {'url': 'ftp://example.com'})
        print("[X] ОШИБКА: валидация не сработала!")
    except Exception as e:
        print(f"[+] Правильно: {e}")


def test_reorder():
    """Тест 4: Изменение порядка элементов"""
    print_section("ТЕСТ 4: Изменение порядка элементов")

    section = Section.objects.first()
    if not section:
        print("[!] Пропускаем тест: нет секций")
        return

    elements = list(ContentElement.objects.filter(section=section).order_by('order'))

    if len(elements) < 2:
        print("[!] Недостаточно элементов для теста (нужно минимум 2)")
        return

    print(f"Элементов в секции: {len(elements)}")
    print("\nПорядок ДО:")
    for el in elements:
        print(f"  ID {el.id}: order={el.order}, type={el.content_type}")

    # Меняем порядок
    new_order = list(reversed(elements))
    for idx, el in enumerate(new_order):
        el.order = idx
        el.save(update_fields=['order'])

    # Проверяем результат
    elements_after = list(ContentElement.objects.filter(section=section).order_by('order'))
    print("\nПорядок ПОСЛЕ:")
    for el in elements_after:
        print(f"  ID {el.id}: order={el.order}, type={el.content_type}")

    print("\n[+] Порядок успешно изменен")


def test_video_url_parsing():
    """Тест 5: Парсинг видео URL"""
    print_section("ТЕСТ 5: Парсинг видео URL")

    from apps.courses.serializers import BlockDataValidator

    test_urls = [
        ('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'),
        ('https://youtu.be/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'),
        ('https://www.youtube.com/embed/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'),
        ('https://vimeo.com/123456789', 'vimeo', '123456789'),
        ('https://vimeo.com/video/123456789', 'vimeo', '123456789'),
    ]

    for url, expected_provider, expected_video_id in test_urls:
        try:
            result = BlockDataValidator.validate('video', {'url': url})
            if result['provider'] == expected_provider and result['video_id'] == expected_video_id:
                print(f"[+] {url}")
                print(f"  -> Provider: {result['provider']}, ID: {result['video_id']}")
            else:
                print(f"[X] {url}")
                print(f"  Ожидалось: {expected_provider}/{expected_video_id}")
                print(f"  Получено: {result['provider']}/{result['video_id']}")
        except Exception as e:
            print(f"[X] {url}")
            print(f"  Ошибка: {e}")


def cleanup_test_data():
    """Удаляет тестовые данные"""
    print_section("Очистка тестовых данных")

    # Удаляем элементы с order >= 100 (созданные в тестах)
    deleted_count = ContentElement.objects.filter(order__gte=100).delete()[0]
    print(f"Удалено тестовых элементов: {deleted_count}")


def main():
    """Главная функция запуска всех тестов"""
    print("\n" + "+" + "=" * 58 + "+")
    print("|" + " " * 10 + "ТЕСТИРОВАНИЕ БЛОЧНОГО РЕДАКТОРА" + " " * 16 + "|")
    print("+" + "=" * 58 + "+")

    try:
        # Запускаем все тесты
        test_data_migration()
        test_create_blocks()
        test_validation()
        test_video_url_parsing()
        test_reorder()

        # Предлагаем очистить тестовые данные
        print("\n" + "=" * 60)
        response = input("\nОчистить тестовые данные? (y/n): ")
        if response.lower() == 'y':
            cleanup_test_data()

        print("\n" + "=" * 60)
        print("  [OK] Все тесты завершены")
        print("=" * 60 + "\n")

    except Exception as e:
        print(f"\n[ERROR] КРИТИЧЕСКАЯ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
