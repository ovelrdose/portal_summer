from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer
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
