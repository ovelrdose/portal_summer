"""
Management command: reset_for_release

Clears all user-generated content from the database in preparation for a
production release. Only superuser accounts are preserved.

Usage:
    python manage.py reset_for_release
    python manage.py reset_for_release --no-input   # skip confirmation prompt

What gets deleted:
  - HomeworkReviewHistory  (courses)
  - HomeworkSubmission     (courses)
  - ContentElement         (courses)
  - Section                (courses)
  - Subscription           (courses)
  - Course                 (courses)
  - Photo                  (gallery)
  - Album                  (gallery)
  - News                   (news)
  - Tag                    (news)
  - Non-superuser User accounts (including related tokens, email addresses, etc.)

What is preserved:
  - Superuser accounts (is_superuser=True) with their auth tokens
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = (
        'Clears all content data and non-superuser accounts. '
        'Preserves only superusers. Intended for use before a production release.'
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            '--no-input',
            '--noinput',
            action='store_true',
            dest='no_input',
            help='Skip the confirmation prompt.',
        )

    def handle(self, *args, **options) -> None:
        no_input: bool = options['no_input']

        if not no_input:
            self.stdout.write(
                self.style.WARNING(
                    '\nWARNING: This command will permanently delete ALL content data\n'
                    'and ALL non-superuser accounts from the database.\n'
                    'Only superuser accounts will be preserved.\n'
                )
            )
            confirm = input('Type "yes" to continue, or anything else to cancel: ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.NOTICE('Operation cancelled.'))
                return

        self.stdout.write('\nStarting database reset...\n')

        report: dict[str, int] = {}

        with transaction.atomic():
            report = self._delete_all_content()
            report['deleted_users'] = self._delete_non_superusers()

        self._print_report(report)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _delete_all_content(self) -> dict[str, int]:
        """
        Deletes all content in dependency order (children before parents).
        Returns a dict with counts of deleted objects per model.
        """
        from apps.courses.models import (
            HomeworkReviewHistory,
            HomeworkSubmission,
            ContentElement,
            Section,
            Subscription,
            Course,
        )
        from apps.gallery.models import Photo, Album
        from apps.news.models import News, Tag

        report: dict[str, int] = {}

        # --- Courses (deepest dependencies first) ---
        count, _ = HomeworkReviewHistory.objects.all().delete()
        report['HomeworkReviewHistory'] = count

        count, _ = HomeworkSubmission.objects.all().delete()
        report['HomeworkSubmission'] = count

        count, _ = ContentElement.objects.all().delete()
        report['ContentElement'] = count

        count, _ = Section.objects.all().delete()
        report['Section'] = count

        count, _ = Subscription.objects.all().delete()
        report['Subscription'] = count

        count, _ = Course.objects.all().delete()
        report['Course'] = count

        # --- Gallery ---
        count, _ = Photo.objects.all().delete()
        report['Photo'] = count

        count, _ = Album.objects.all().delete()
        report['Album'] = count

        # --- News ---
        # Clear M2M through-table first, then delete news, then tags
        for news_item in News.objects.all():
            news_item.tags.clear()
        count, _ = News.objects.all().delete()
        report['News'] = count

        count, _ = Tag.objects.all().delete()
        report['Tag'] = count

        return report

    def _delete_non_superusers(self) -> int:
        """
        Deletes all user accounts that are not superusers.
        Django's cascade will automatically remove related objects
        (auth tokens, allauth email addresses, social accounts, etc.).
        Returns the number of deleted user records.
        """
        qs = User.objects.filter(is_superuser=False)
        count = qs.count()
        qs.delete()
        return count

    def _print_report(self, report: dict[str, int]) -> None:
        """Prints a formatted summary of what was deleted."""
        self.stdout.write(self.style.SUCCESS('\n=== Reset complete. Deletion report ===\n'))

        content_keys = [
            'HomeworkReviewHistory',
            'HomeworkSubmission',
            'ContentElement',
            'Section',
            'Subscription',
            'Course',
            'Photo',
            'Album',
            'News',
            'Tag',
        ]

        self.stdout.write('  Content data:')
        for key in content_keys:
            count = report.get(key, 0)
            style = self.style.WARNING if count > 0 else self.style.NOTICE
            self.stdout.write(f'    {key:<28} {style(str(count))} deleted')

        deleted_users = report.get('deleted_users', 0)
        style = self.style.WARNING if deleted_users > 0 else self.style.NOTICE
        self.stdout.write(f'\n  Non-superuser accounts:      {style(str(deleted_users))} deleted')

        # Show preserved superusers
        superusers = list(
            get_user_model()
            .objects.filter(is_superuser=True)
            .values_list('email', flat=True)
        )
        if superusers:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n  Preserved superusers ({len(superusers)}): '
                    + ', '.join(superusers)
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING('\n  No superuser accounts found in the database.')
            )

        self.stdout.write('')
