from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import verify_password, create_access_token, create_refresh_token, get_current_user
from app.models.base import User
from schemas.auth import LoginSchema, TokenSchema
from schemas.users import UserMeSchema

router = APIRouter(prefix="/auth", tags=["Аутентификация"])


@router.post("/login", response_model=TokenSchema, summary="Вход пользователя в систему")
def login(login_data: LoginSchema, db: Session = Depends(get_db)):
    # 1. Ищем пользователя по email
    user = db.query(User).filter(User.email == login_data.email).first()

    # 2. Сверяем с полем user.password (колонкой в БД от коллеги!)
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Проверяем активность
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь заблокирован",
        )

    # 4. Генерируем токены
    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserMeSchema, summary="Текущий пользователь: id, имя, роль, стек, грейд")
def get_me(current_user: User = Depends(get_current_user)):
    """
    Возвращает профиль сотрудника в точности по ТЗ техлида:
    id, имя (fio), роль, стек, грейд.
    """
    role_name = current_user.roles[0].name if current_user.roles else None
    stack_name = current_user.stacks[0].name if current_user.stacks else None
    grade_name = current_user.grade.name if current_user.grade else None

    return {
        "id": current_user.id,
        "fio": current_user.fio,
        "email": current_user.email,
        "role": role_name,
        "stack": stack_name,
        "grade": grade_name,
        "is_active": current_user.is_active,
    }