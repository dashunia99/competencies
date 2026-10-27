import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    create_refresh_token,
    get_current_user,
    verify_password,
)
from app.models.base import User
from schemas.auth import LoginSchema, TokenSchema
from schemas.users import UserMeSchema

router = APIRouter(prefix="/auth", tags=["Аутентификация"])


# ==========================================
# СХЕМЫ ДЛЯ REFRESH-ТОКЕНА (Замечание 5.4)
# ==========================================
class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ==========================================
# 1. ВХОД В СИСТЕМУ (выдача access + refresh)
# ==========================================
@router.post(
    "/login",
    response_model=TokenSchema,
    summary="Вход пользователя в систему",
)
def login(login_data: LoginSchema, db: Session = Depends(get_db)):
    # 1. Ищем пользователя по email
    user = db.query(User).filter(User.email == login_data.email).first()

    # 2. Сверяем пароль
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Проверяем блокировку
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь заблокирован",
        )

    # 4. Генерируем оба токена
    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# ==========================================
# 2. ОБНОВЛЕНИЕ ACCESS-ТОКЕНА (Пункт 4.2 / Замечание 5.4)
# ==========================================
@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    summary="Обновить access токен по refresh токену",
)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Принимает refresh_token, валидирует его и выдает новый короткоживущий access_token.
    Устраняет проблему неиспользуемого refresh-токена из аудита.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Недействительный или истекший refresh токен",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Расшифровываем и проверяем токен
    try:
        data = jwt.decode(payload.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        token_type: str = data.get("type")
        user_id_str: str = data.get("sub")

        # Токен валиден только если это именно refresh, и в нем есть sub (user_id)
        if token_type != "refresh" or not user_id_str:
            raise credentials_exception

        user_id = int(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    # 2. Проверяем существование пользователя в базе
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Проверяем активность аккаунта
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь заблокирован",
        )

    # 4. Выдаем свежий access-токен
    new_access_token = create_access_token(user_id=user.id)

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
    }


# ==========================================
# 3. ТЕКУЩИЙ ПРОФИЛЬ (COMP-17)
# ==========================================
@router.get(
    "/me",
    response_model=UserMeSchema,
    summary="Текущий пользователь: id, имя, роль, стек, грейд, должность, дата",
)
def get_me(current_user: User = Depends(get_current_user)):
    role_name = current_user.roles[0].name if current_user.roles else None
    stack_name = current_user.stack.name if current_user.stack else None
    grade_name = current_user.grade.name if current_user.grade else None

    return {
        "id": current_user.id,
        "fio": current_user.fio,
        "email": current_user.email,
        "position": current_user.position,
        "start_date": current_user.start_date,
        "role": role_name,
        "stack": stack_name,
        "grade": grade_name,
        "is_active": current_user.is_active,
    }