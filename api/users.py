from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import hash_password
from app.models.base import User, Role, UserRole
from schemas.users import CreateUserSchema, UserSchema

router = APIRouter(prefix="/users", tags=["Пользователи"])


@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED, summary="Создание пользователя и назначение роли")
def create_user(
    user_data: CreateUserSchema,
    db: Session = Depends(get_db)
):
    # 1. Проверяем, не занят ли email
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )

    # 2. Создаем пользователя
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

    # 3. Автоматически привязываем роль
    assigned_role_name = None
    if user_data.role_name:
        role = db.query(Role).filter(Role.name == user_data.role_name).first()
        if not role:
            # Если такой роли еще нет в базе, создаем её на лету
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