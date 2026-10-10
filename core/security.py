from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from core.database import get_db
from models.users import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "SUPER_SECRET_KEY_CHANGE_ME_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# указывает Swagger, куда слать логин/пароль для получения токена
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# Утилиты для работы с паролями

def hash_password(password: str) -> str:
    """Превращает открытый пароль в bcrypt-хеш."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Сверяет открытый пароль с хешем из базы."""
    return pwd_context.verify(plain_password, hashed_password)


# --- Генерация JWT токенов ---

def create_token(data: dict, expires_delta: timedelta) -> str:
    """Базовая вспомогательная функция генерации токена."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(user_id: int) -> str:
    """Создает короткоживущий Access-токен."""
    payload = {"sub": str(user_id), "type": "access"}
    return create_token(payload, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(user_id: int) -> str:
    """Создает долгоживущий Refresh-токен."""
    payload = {"sub": str(user_id), "type": "refresh"}
    return create_token(payload, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Зависимость для защиты эндпоинтов:
    - Извлекает токен из заголовка Authorization: Bearer <token>.
    - Расшифровывает и валидирует JWT.
    - Проверяет тип токена (только access!).
    - Находит пользователя в БД и проверяет, что он не заблокирован.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id_str is None or token_type != "access":
            raise credentials_exception

        user_id = int(user_id_str)
    except (jwt.PyJWTError, ValueError):

        raise credentials_exception

    # Ищем пользователя в базе
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь заблокирован",
        )

    return user