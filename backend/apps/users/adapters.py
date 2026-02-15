import threading
from allauth.account.adapter import DefaultAccountAdapter
from django.core.mail import EmailMultiAlternatives, EmailMessage


class AsyncEmailAccountAdapter(DefaultAccountAdapter):
    """
    Кастомный адаптер allauth для асинхронной отправки email.
    Отправляет email в фоновом потоке, чтобы не блокировать HTTP-запрос.
    """

    def send_mail(self, template_prefix, email, context):
        """
        Переопределяем send_mail для асинхронной отправки.
        Запускаем отправку в отдельном потоке, чтобы сразу вернуть ответ пользователю.
        """
        # Формируем email-сообщение синхронно (это быстро)
        msg = self.render_mail(template_prefix, email, context)

        # Отправляем в отдельном потоке
        thread = threading.Thread(
            target=self._send_email_async,
            args=(msg,),
            daemon=True
        )
        thread.start()

    def _send_email_async(self, msg):
        """
        Вспомогательный метод для отправки email в фоновом потоке.

        Args:
            msg: EmailMessage или EmailMultiAlternatives объект
        """
        try:
            msg.send()
        except Exception as e:
            # Логируем ошибку, но не прерываем регистрацию
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send email asynchronously: {e}")
