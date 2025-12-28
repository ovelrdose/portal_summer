from django.db import IntegrityError
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Кастомная обработка исключений для API.
    Преобразует IntegrityError в понятный JSON-ответ.
    """
    # Сначала вызываем стандартный обработчик DRF
    response = exception_handler(exc, context)

    # Если DRF не обработал исключение, обрабатываем его сами
    if response is None:
        if isinstance(exc, IntegrityError):
            # Извлекаем информацию об ошибке
            error_message = str(exc)

            # Определяем, какое поле вызвало ошибку
            if 'email' in error_message.lower() or 'unique constraint' in error_message.lower():
                data = {
                    'email': ['Пользователь с таким email уже зарегистрирован.']
                }
            else:
                data = {
                    'detail': 'Нарушение уникальности данных. Проверьте введенную информацию.'
                }

            return Response(data, status=status.HTTP_400_BAD_REQUEST)

    return response
