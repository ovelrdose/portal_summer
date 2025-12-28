from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer
from django.utils.translation import gettext_lazy as _
from .models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    is_admin = serializers.ReadOnlyField()
    is_teacher = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'patronymic',
            'full_name', 'role', 'is_admin', 'is_teacher', 'is_superuser',
            'grade', 'country', 'city', 'photo', 'created_at'
        ]
        read_only_fields = ['id', 'email', 'role', 'is_admin', 'is_teacher', 'is_superuser', 'created_at']


class UserPublicSerializer(serializers.ModelSerializer):
    """Публичная информация о пользователе"""
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ['id', 'full_name', 'photo', 'grade']


class CustomRegisterSerializer(RegisterSerializer):
    username = None
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    patronymic = serializers.CharField(required=False, allow_blank=True)
    grade = serializers.IntegerField(required=False, min_value=1, max_value=11)
    country = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, email):
        """
        Валидация email с проверкой уникальности в таблице User.
        Переопределяет родительский метод для корректной обработки дубликатов.
        """
        # Вызываем родительскую валидацию (clean_email от allauth adapter)
        from allauth.account.adapter import get_adapter
        email = get_adapter().clean_email(email)

        # Проверяем наличие email в таблице User напрямую
        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                _('Пользователь с таким email уже зарегистрирован.')
            )

        return email

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data.update({
            'first_name': self.validated_data.get('first_name', ''),
            'last_name': self.validated_data.get('last_name', ''),
            'patronymic': self.validated_data.get('patronymic', ''),
            'grade': self.validated_data.get('grade'),
            'country': self.validated_data.get('country', ''),
            'city': self.validated_data.get('city', ''),
        })
        return data

    def save(self, request):
        user = super().save(request)
        user.first_name = self.validated_data.get('first_name', '')
        user.last_name = self.validated_data.get('last_name', '')
        user.patronymic = self.validated_data.get('patronymic', '')
        user.grade = self.validated_data.get('grade')
        user.country = self.validated_data.get('country', '')
        user.city = self.validated_data.get('city', '')
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)


class AdminResetPasswordSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    new_password = serializers.CharField(required=True, min_length=8)


class AssignRoleSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=User.Role.choices)


class CustomPasswordResetSerializer(serializers.Serializer):
    """
    Кастомный сериализатор для восстановления пароля.
    Формирует ссылку на фронтенд вместо backend URL.
    """
    email = serializers.EmailField()

    def validate_email(self, email):
        """Проверяет существование email (регистронезависимо)"""
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Проверяем существование пользователя
        if not User.objects.filter(email__iexact=email).exists():
            # В целях безопасности не сообщаем об отсутствии пользователя
            # Просто возвращаем email
            pass

        return email.lower()

    def save(self):
        """Отправляет email с ссылкой для восстановления пароля"""
        request = self.context.get('request')
        email = self.validated_data['email']

        from django.conf import settings
        from django.contrib.auth import get_user_model
        from django.core.mail import send_mail
        from django.template.loader import render_to_string

        # Используем allauth token generator и uid encoder для совместимости с dj-rest-auth
        from allauth.account.forms import default_token_generator
        from allauth.account.utils import user_pk_to_url_str

        User = get_user_model()

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # В целях безопасности не сообщаем об отсутствии пользователя
            return

        # Генерируем токен и uid (base36 формат для совместимости с allauth)
        uid = user_pk_to_url_str(user)
        token = default_token_generator.make_token(user)

        # Формируем URL для фронтенда
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        password_reset_url = f"{frontend_url}/reset-password/{uid}/{token}/"

        # Подготавливаем контекст для шаблона
        context = {
            'user': user,
            'password_reset_url': password_reset_url,
            'uid': uid,
            'token': token,
        }

        # Рендерим шаблоны
        subject = render_to_string('registration/password_reset_subject.txt', context).strip()
        html_message = render_to_string('registration/password_reset_email.html', context)

        # Отправляем email
        send_mail(
            subject=subject,
            message='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
