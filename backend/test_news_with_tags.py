#!/usr/bin/env python
"""
Скрипт для создания тестовой новости с тегами.
Использование: python test_news_with_tags.py
"""

import os
import django

# Настройка Django окружения
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'portal_summer.settings')
django.setup()

from apps.news.models import News, Tag

def create_test_news():
    """Создает тестовую новость с тегами"""

    # Проверяем наличие тегов
    tag_count = Tag.objects.count()
    if tag_count == 0:
        print("WARNING: No tags found. Creating default tags first...")
        from django.core.management import call_command
        call_command('create_default_tags')

    # Получаем теги
    tag_events = Tag.objects.get(slug='events')
    tag_education = Tag.objects.get(slug='education')

    # Создаем тестовую новость
    news = News.objects.create(
        title='Добро пожаловать на образовательный портал!',
        short_description='Мы рады приветствовать вас на нашем новом образовательном портале. Здесь вы найдете интересные курсы и материалы.',
        content_blocks=[
            {
                'type': 'text',
                'data': {
                    'text': '<h2>О портале</h2><p>Наш образовательный портал предлагает широкий выбор авторских курсов по различным направлениям.</p>'
                }
            },
            {
                'type': 'text',
                'data': {
                    'text': '<h3>Что мы предлагаем:</h3><ul><li>Качественные образовательные материалы</li><li>Опытные преподаватели</li><li>Удобную систему обучения</li><li>Сертификаты по окончании курсов</li></ul>'
                }
            },
            {
                'type': 'link',
                'data': {
                    'title': 'Перейти к курсам',
                    'url': '/courses'
                }
            }
        ],
        is_published=True
    )

    # Добавляем теги
    news.tags.add(tag_events, tag_education)
    news.save()

    print(f"[OK] Created test news: '{news.title}'")
    print(f"  - ID: {news.id}")
    print(f"  - Status: {'Published' if news.is_published else 'Draft'}")
    print(f"  - Tags: {', '.join([tag.name for tag in news.tags.all()])}")
    print(f"  - Blocks: {len(news.content_blocks)}")
    print(f"\nView at: http://localhost:3000/news/{news.id}")

    return news

if __name__ == '__main__':
    print("Creating test news...")
    print("-" * 50)

    try:
        news = create_test_news()
        print("-" * 50)
        print("SUCCESS! Test news created.")
    except Exception as e:
        print("-" * 50)
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
