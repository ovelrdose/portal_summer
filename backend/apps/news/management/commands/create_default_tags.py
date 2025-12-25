from django.core.management.base import BaseCommand
from apps.news.models import Tag


class Command(BaseCommand):
    help = 'Creates default tags for news'

    def handle(self, *args, **options):
        default_tags = [
            ('События', 'events'),
            ('Образование', 'education'),
            ('Объявления', 'announcements'),
            ('Новости курса', 'course-news'),
            ('Достижения', 'achievements'),
            ('Расписание', 'schedule'),
        ]

        created_count = 0
        existing_count = 0

        for name, slug in default_tags:
            tag, created = Tag.objects.get_or_create(
                slug=slug,
                defaults={'name': name}
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created tag: {name} ({slug})')
                )
            else:
                existing_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Tag already exists: {name} ({slug})')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nTotal: {created_count} created, {existing_count} already existed'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(f'Total tags in database: {Tag.objects.count()}')
        )
