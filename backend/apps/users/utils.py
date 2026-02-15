import threading
import logging
from django.core.mail import send_mail as django_send_mail

logger = logging.getLogger(__name__)


def send_mail_async(subject, message, from_email, recipient_list, html_message=None, fail_silently=False):
    """
    Асинхронная отправка email в фоновом потоке.

    Принимает те же параметры, что и django.core.mail.send_mail,
    но отправляет email в отдельном потоке, не блокируя основной процесс.

    Args:
        subject: Тема письма
        message: Текстовое содержимое письма
        from_email: Email отправителя
        recipient_list: Список получателей
        html_message: HTML версия письма (опционально)
        fail_silently: Не выбрасывать исключения при ошибках
    """
    def _send():
        try:
            django_send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=recipient_list,
                html_message=html_message,
                fail_silently=fail_silently,
            )
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_list}: {e}")
            if not fail_silently:
                raise

    thread = threading.Thread(target=_send, daemon=True)
    thread.start()
