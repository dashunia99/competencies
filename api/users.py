from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import (
    hash_password,
    get_current_user,
    require_roles,
    verify_user_access,
)
from app.models.base import User, Role, UserRole
from schemas.users import CreateUserSchema, UserSchema

router = APIRouter(prefix="/users", tags=["Пользователи"])


# 1. Создание пользователя — ТОЛЬКО ДЛЯ АДМИНИСТРАТОРА
@router.post(
    "/",
    response_model=UserSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Создать пользователя (только Администратор)",
)
def create_user(
    user_data: CreateUserSchema,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("Администратор")),
):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )

    new_user = User(
        fio=user_data.fio,
        email=user_data.email,
        password=hash_password(user_data.password),
        grade_id=user_data.grade_id,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    assigned_role_name = None
    if user_data.role_name:
        role = db.query(Role).filter(Role.name == user_data.role_name).first()
        if not role:
            role = Role(name=user_data.role_name)
            db.add(role)
            db.commit()
            db.refresh(role)

        user_role = UserRole(user_id=new_user.id, role_id=role.id)
        db.add(user_role)
        db.commit()
        assigned_role_name = role.name

    return {
        "id": new_user.id,
        "fio": new_user.fio,
        "email": new_user.email,
        "role": assigned_role_name,
        "stack": None,
        "grade": new_user.grade.name if new_user.grade else None,
        "is_active": new_user.is_active,
    }


# 2. Список ВСЕХ пользователей — ТОЛЬКО ДЛЯ АДМИНА И ЭКСПЕРТА
@router.get(
    "/",
    response_model=List[UserSchema],
    summary="Список всех пользователей (Администратор и Эксперт)",
)
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("Администратор", "Эксперт")),
):
    users = db.query(User).all()
    result = []
    for u in users:
        role_name = u.roles[0].name if u.roles else None
        stack_name = u.stacks[0].name if u.stacks else None
        grade_name = u.grade.name if u.grade else None
        result.append({
            "id": u.id,
            "fio": u.fio,
            "email": u.email,
            "role": role_name,
            "stack": stack_name,
            "grade": grade_name,
            "is_active": u.is_active,
        })
    return result


# 3. Карточка пользователя по ID — Админ, Эксперт или САМ пользователь
@router.get(
    "/{user_id}",
    response_model=UserSchema,
    summary="Карточка пользователя по ID (своя или для Админа/Эксперта)",
)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Проверка: сотрудник не может смотреть чужую карточку!
    verify_user_access(target_user_id=user_id, current_user=current_user)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    role_name = user.roles[0].name if user.roles else None
    stack_name = user.stacks[0].name if user.stacks else None
    grade_name = user.grade.name if user.grade else None

    return {
        "id": user.id,
        "fio": user.fio,
        "email": user.email,
        "role": role_name,
        "stack": stack_name,
        "grade": grade_name,
        "is_active": user.is_active,
    }


# 4. Заблокировать пользователя — ТОЛЬКО АДМИНИСТРАТОР
@router.post(
    "/{user_id}/block",
    response_model=UserSchema,
    summary="Заблокировать пользователя (только Администратор)",
)
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("Администратор")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.is_active = False
    db.commit()
    db.refresh(user)

    role_name = user.roles[0].name if user.roles else None
    return {
        "id": user.id,
        "fio": user.fio,
        "email": user.email,
        "role": role_name,
        "stack": None,
        "grade": user.grade.name if user.grade else None,
        "is_active": user.is_active,
    }