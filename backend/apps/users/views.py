from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import User
from .serializers import (
    UserSerializer,
    ChangePasswordSerializer,
    AdminResetPasswordSerializer,
    AssignRoleSerializer
)
from .permissions import IsAdmin


class ProfileView(generics.RetrieveUpdateAPIView):
    """Личный кабинет пользователя"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    """Список пользователей (для админа)"""
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get('role')
        grade = self.request.query_params.get('grade')

        if role:
            queryset = queryset.filter(role=role)
        if grade:
            queryset = queryset.filter(grade=grade)

        return queryset


class UserDetailView(generics.RetrieveAPIView):
    """Детали пользователя (для админа)"""
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """Смена пароля пользователем"""
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    if not user.check_password(serializer.validated_data['old_password']):
        return Response(
            {'error': 'Неверный текущий пароль'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(serializer.validated_data['new_password'])
    user.save()
    return Response({'message': 'Пароль успешно изменен'})


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_reset_password(request):
    """Сброс пароля пользователю администратором"""
    serializer = AdminResetPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = get_object_or_404(User, id=serializer.validated_data['user_id'])
    user.set_password(serializer.validated_data['new_password'])
    user.save()

    return Response({'message': f'Пароль пользователя {user.email} сброшен'})


@api_view(['POST'])
@permission_classes([IsAdmin])
def assign_role(request):
    """Назначение роли пользователю"""
    serializer = AssignRoleSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = get_object_or_404(User, id=serializer.validated_data['user_id'])
    user.role = serializer.validated_data['role']
    user.save()

    return Response({
        'message': f'Пользователю {user.email} назначена роль {user.get_role_display()}'
    })
