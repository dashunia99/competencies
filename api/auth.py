from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import verify_password, create_access_token, create_refresh_token
from models.users import User
from schemas.auth import LoginSchema, TokenSchema

from core.security import get_current_user
from schemas.users import UserSchema

router = APIRouter(prefix="/auth", tags=["Аутентификация"])
@router.post("/login", response_model=TokenSchema, summary="Вход пользователя в систему")

def login(login_data: LoginSchema, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь заблокирован",
        )

    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

@router.get(
    "/me",
    response_model=UserSchema,
    summary="Получение профиля текущего пользователя"
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Защищенная ручка.
    Благодаря Depends(get_current_user) сюда невозможно попасть без валидного access-токена.
    """
    return current_user