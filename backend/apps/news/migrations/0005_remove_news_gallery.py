# Generated manually on 2026-02-15
# Remove NewsImage model - gallery is now implemented as block in block editor

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('news', '0004_add_news_gallery'),
    ]

    operations = [
        migrations.DeleteModel(
            name='NewsImage',
        ),
    ]
